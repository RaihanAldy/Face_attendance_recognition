import os
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import boto3
from botocore.exceptions import ClientError
from dateutil import parser
from dotenv import load_dotenv
from decimal import Decimal

load_dotenv()

# ------------------------------------
# CONFIG
# ------------------------------------
MONGODB_URI = os.getenv('MONGODB_URI')
DB_NAME = os.getenv('DATABASE_NAME')
ATT_COLLECTION = os.getenv('ATT_COLLECTION')
CHECKPOINT_COLL = os.getenv('CHECKPOINT_COLL')
DYNAMO_TABLE = os.getenv('DYNAMO_TABLE')
AWS_REGION = os.getenv('AWS_REGION')

# Add AI Insights config
INSIGHTS_TABLE = os.getenv('INSIGHTS_TABLE', 'ai-insight')
MONGO_INSIGHTS_COLL = os.getenv('MONGO_INSIGHTS_COLL', 'ai_insights')

session = boto3.Session()
dynamodb = session.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(DYNAMO_TABLE)
insights_table = dynamodb.Table(INSIGHTS_TABLE)

mc = MongoClient(MONGODB_URI)
db = mc[DB_NAME]
att = db[ATT_COLLECTION]
checkpoints = db[CHECKPOINT_COLL]
mongo_insights = db[MONGO_INSIGHTS_COLL]

BATCH_SIZE = 25
MAX_RETRIES = 5
BASE_DELAY = 1.0


# ------------------------------------
# DECIMAL CONVERSION UTILITIES
# ------------------------------------
def decimal_to_native(obj):
    """
    Recursively convert Decimal objects to native Python types (int/float)
    This is CRITICAL for MongoDB compatibility
    """
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        # Convert Decimal to int if it's a whole number, otherwise float
        if obj % 1 == 0:
            result = int(obj)
            return result
        else:
            result = float(obj)
            return result
    return obj


# ------------------------------------
# UTILITIES
# ------------------------------------
def iso_now():
    return datetime.now(timezone.utc).isoformat()


def get_last_checkpoint():
    doc = checkpoints.find_one({'_id': 'mongo_to_dynamo'})
    if not doc:
        checkpoints.insert_one({'_id': 'mongo_to_dynamo', 'last_synced_at': None})
        return None
    return doc.get('last_synced_at')


def set_last_checkpoint(ts_iso):
    checkpoints.update_one(
        {'_id': 'mongo_to_dynamo'},
        {'$set': {'last_synced_at': ts_iso, 'updated_at': datetime.utcnow()}},
        upsert=True
    )


def transform(doc):
    """Transform MongoDB attendance document to DynamoDB format"""
    checkin = doc.get('checkin') or {}
    checkout = doc.get('checkout') or {}

    # Pick most relevant timestamp for sort key
    ts = checkout.get('timestamp') or checkin.get('timestamp') or datetime.now(timezone.utc).isoformat()

    return {
        'employee_id': doc.get('employee_id', ''),
        'timestamp': ts,
        'employee_name': doc.get('employee_name', ''),
        'date': doc.get('date', ''),
        'checkin_status': checkin.get('status', ''),
        'checkin_time': checkin.get('timestamp', ''),
        'checkout_status': checkout.get('status', ''),
        'checkout_time': checkout.get('timestamp', ''),
        'work_duration_minutes': int(doc.get('work_duration_minutes', 0) or 0),
        'source_id': str(doc.get('_id')),
        'synced_at': iso_now()
    }


def chunked(iterable, size=25):
    """Split iterable into chunks"""
    buf = []
    for it in iterable:
        buf.append(it)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf


def batch_write(items):
    """Write items to DynamoDB in batch"""
    with table.batch_writer(overwrite_by_pkeys=['employee_id', 'timestamp']) as batch:
        for it in items:
            batch.put_item(Item=it)


# ------------------------------------
# AI INSIGHTS SYNC
# ------------------------------------
def fetch_insights_from_dynamodb():
    """
    LEGACY FUNCTION NAME - Fetch AI insights from DynamoDB and sync to MongoDB
    WITH PROPER DECIMAL CONVERSION
    """
    print("\n📥 Fetching insights from DynamoDB...")
    
    try:
        # Scan insights table
        response = insights_table.scan()
        items = response.get('Items', [])
        
        print(f"📊 Found {len(items)} insight(s)")
        
        if not items:
            print("ℹ️ No insights to sync")
            return 0
        
        synced_count = 0
        
        for item in items:
            try:
                print(f"\n🔍 Raw insight: {item}")
                
                # ⚠️ CRITICAL FIX: Convert ALL Decimal values to native types
                item = decimal_to_native(item)
                print(f"✅ After decimal conversion: {item}")
                
                # Extract key fields
                record_id = item.get('record_id')
                insight_date = item.get('date')
                
                if not record_id or not insight_date:
                    print(f"⚠️ Skipping insight - missing record_id or date")
                    continue
                
                # Extract key_findings (handle both list and string formats)
                key_findings = item.get('key_findings', [])
                if isinstance(key_findings, str):
                    key_findings = [key_findings]
                
                
                # Extract numeric fields (now already converted from Decimal)
                processed_records = item.get('processed_records', 0)
                unique_employees = item.get('unique_employees', 0)
                
                
                # Prepare MongoDB document
                mongo_doc = {
                    'record_id': record_id,
                    'insight_date': insight_date,
                    'insight_type': item.get('insightType', 'general'),
                    'summary': item.get('summary', ''),
                    'key_findings': key_findings,
                    'processed_records': processed_records,  # Now properly converted
                    'unique_employees': unique_employees,    # Now properly converted
                    'data_range': item.get('data_range', insight_date),
                    'generated_at': parser.isoparse(item.get('generated_at', iso_now())),
                    'source': item.get('source', 'dynamodb_lambda'),
                    'synced_to_mongo_at': datetime.utcnow()
                }
                
                
                # Upsert to MongoDB
                result = mongo_insights.update_one(
                    {'record_id': record_id},
                    {'$set': mongo_doc},
                    upsert=True
                )
                
               
                synced_count += 1
                
            except Exception as e:
                print(f"❌ Error syncing insight {item.get('record_id', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"\n{'='*50}")
        print(f"✅ {synced_count} insights synced to MongoDB.")
        return synced_count
        
    except Exception as e:
        print(f"❌ Error fetching insights from DynamoDB: {e}")
        import traceback
        traceback.print_exc()
        return 0


def sync_insights_from_dynamo():
    """
    NEW FUNCTION NAME - Alias for fetch_insights_from_dynamodb
    """
    return fetch_insights_from_dynamodb()


# ------------------------------------
# ATTENDANCE SYNC (MAIN LOGIC)
# ------------------------------------
def sync_attendance():
    """Sync attendance from MongoDB to DynamoDB"""
    print("\n" + "="*60)
    print("🚀 ATTENDANCE SYNC TO DYNAMODB")
    print("="*60)
    
    last_sync = get_last_checkpoint()
    query = {}

    # Incremental sync
    if last_sync:
        print(f"📅 Incremental sync since: {last_sync}")
        last_dt = parser.isoparse(last_sync)
        query['updated_at'] = {'$gt': last_dt}
    else:
        # First sync → last 24 hours
        print("📅 First sync - fetching last 24 hours")
        since = datetime.utcnow() - timedelta(days=1)
        query['updated_at'] = {'$gt': since}

    print("🔍 Querying MongoDB...")
    cursor = att.find(query).sort('updated_at', 1)

    to_sync = []
    for doc in cursor:
        to_sync.append(transform(doc))

    count = len(to_sync)
    print(f"📦 Found {count} attendance records to sync")

    if count == 0:
        set_last_checkpoint(iso_now())
        return 0

    # Batch sync
    synced = 0
    for i, chunk in enumerate(chunked(to_sync, BATCH_SIZE), 1):
        attempt = 0
        while attempt <= MAX_RETRIES:
            try:
                batch_write(chunk)
                synced += len(chunk)
                print(f"✅ Synced batch {i}: {len(chunk)} records ({synced}/{count})")
                break
            except ClientError as e:
                attempt += 1
                delay = BASE_DELAY * (2 ** (attempt - 1))
                print(f"⚠️ Batch failed (attempt {attempt}), retrying in {delay}s → {e}")
                time.sleep(delay)

        if attempt > MAX_RETRIES:
            print("❌ ERROR: failed to write after max retries")
            raise SystemExit(1)

    # Update checkpoint
    set_last_checkpoint(iso_now())
    print(f"\n✅ Attendance sync completed: {count} records")
    return count


# ------------------------------------
# MAIN ENTRY POINT
# ------------------------------------
def main():
    """
    Main sync function - syncs both attendance and AI insights
    """
    start_time = time.time()
    
    try:
        # 1. Sync attendance to DynamoDB
        attendance_count = sync_attendance()
        
        # 2. Sync AI insights from DynamoDB to MongoDB
        insights_count = fetch_insights_from_dynamodb()
        
        elapsed = time.time() - start_time
        
        print("\n" + "="*60)
        print("🎉 SYNC PROCESS COMPLETED")
        print(f"📊 Attendance records: {attendance_count}")
        print(f"🤖 AI insights: {insights_count}")
        print(f"⏱️ Time elapsed: {elapsed:.2f}s")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Sync failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    main()