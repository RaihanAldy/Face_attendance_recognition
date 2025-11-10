import os
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import boto3
from botocore.exceptions import ClientError
from dateutil import parser
from dotenv import load_dotenv
from decimal import Decimal
from notification_service import send_all_notifications

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


def parse_timestamp(ts):
    """
    Parse timestamp that can be either:
    - datetime object
    - ISO string
    - None
    Returns datetime object or None
    """
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, str):
        try:
            return parser.isoparse(ts)
        except:
            return None
    return None


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
# ATTENDANCE SYNC (MAIN LOGIC) - FIXED
# ------------------------------------

def sync_single_record(mongo_doc):
    """
    ✅ Sync single attendance record to DynamoDB immediately
    Used for auto-sync on checkout
    
    Args:
        mongo_doc: MongoDB attendance document
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"\n📤 Syncing single record to DynamoDB...")
        print(f"   Employee ID: {mongo_doc.get('employee_id')}")
        print(f"   Employee Name: {mongo_doc.get('employee_name')}")
        print(f"   Date: {mongo_doc.get('date')}")
        
        # ✅ CHECK IF RECORD HAS CHECKOUT
        if not mongo_doc.get('checkout'):
            print(f"⚠️ Record doesn't have checkout yet, skipping sync")
            return False
        
        # Transform to DynamoDB format
        dynamo_item = transform(mongo_doc)
        
        print(f"   Transformed item keys: {list(dynamo_item.keys())}")
        print(f"   Check-in: {dynamo_item.get('checkin_time')}")
        print(f"   Check-out: {dynamo_item.get('checkout_time')}")
        print(f"   Duration: {dynamo_item.get('work_duration_minutes')} min")
        
        # Write to DynamoDB with retry logic
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                response = table.put_item(Item=dynamo_item)
                print(f"✅ Successfully written to DynamoDB on attempt {attempt + 1}")
                print(f"   Response: {response.get('ResponseMetadata', {}).get('HTTPStatusCode')}")
                return True
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_msg = e.response.get('Error', {}).get('Message', 'Unknown')
                print(f"⚠️ Attempt {attempt + 1} failed: {error_code}")
                print(f"   Message: {error_msg}")
                
                if attempt < max_attempts - 1:
                    delay = BASE_DELAY * (2 ** attempt)
                    print(f"   Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    print(f"❌ Failed after {max_attempts} attempts")
                    raise
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                import traceback
                traceback.print_exc()
                raise
                    
        return False
        
    except Exception as e:
        print(f"❌ Error syncing single record: {e}")
        import traceback
        traceback.print_exc()
        return False

def sync_attendance():
    """
    ✅ IMPROVED: Sync attendance from MongoDB to DynamoDB
    Now handles both batch sync and provides better debugging
    """
    print("\n" + "="*60)
    print("🚀 ATTENDANCE SYNC TO DYNAMODB")
    print("="*60)
    
    last_sync = get_last_checkpoint()
    query = {}

    # ✅ Use $or to check both field names
    if last_sync:
        print(f"📅 Incremental sync since: {last_sync}")
        last_dt = parser.isoparse(last_sync)
        
        # Check both 'updatedAt' and 'updated_at'
        query['$or'] = [
            {'updatedAt': {'$gt': last_dt}},
            {'updated_at': {'$gt': last_dt}}
        ]
    else:
        # First sync → get all records with checkout (completed attendance)
        print("📅 First sync - fetching all completed attendance (with checkout)")
        query = {
            'checkout': {'$exists': True}  # ✅ Only sync completed attendance
        }

    print(f"🔍 Query: {query}")
    print("📊 Querying MongoDB...")
    
    try:
        cursor = att.find(query).sort('updatedAt', -1)  # Most recent first
        count_check = att.count_documents(query)
        print(f"📦 Found {count_check} records matching query")
    except:
        cursor = att.find(query)
        count_check = att.count_documents(query)
        print(f"📦 Found {count_check} records (no sort applied)")

    to_sync = []
    for doc in cursor:
        try:
            transformed = transform(doc)
            to_sync.append(transformed)
            
            # Debug first 3 records
            if len(to_sync) <= 3:
                print(f"\n🔍 Record {len(to_sync)} sample:")
                print(f"   Employee: {doc.get('employee_name')} ({doc.get('employee_id')})")
                print(f"   Date: {doc.get('date')}")
                print(f"   Check-in: {doc.get('checkin', {}).get('timestamp', 'N/A')}")
                print(f"   Check-out: {doc.get('checkout', {}).get('timestamp', 'N/A')}")
                print(f"   Duration: {doc.get('work_duration_minutes', 0)} min")
                
        except Exception as e:
            print(f"⚠️ Failed to transform record {doc.get('_id')}: {e}")
            continue

    count = len(to_sync)
    print(f"\n📦 Total records to sync: {count}")

    if count == 0:
        print("ℹ️ No new records to sync")
        set_last_checkpoint(iso_now())
        return 0

    # Batch sync with progress
    synced = 0
    failed = 0
    
    for i, chunk in enumerate(chunked(to_sync, BATCH_SIZE), 1):
        attempt = 0
        while attempt <= MAX_RETRIES:
            try:
                print(f"\n📤 Syncing batch {i}/{(count + BATCH_SIZE - 1) // BATCH_SIZE} ({len(chunk)} records)...")
                batch_write(chunk)
                synced += len(chunk)
                
                # Show progress
                progress = (synced / count) * 100
                print(f"✅ Batch {i} synced! Progress: {synced}/{count} ({progress:.1f}%)")
                break
                
            except ClientError as e:
                attempt += 1
                delay = BASE_DELAY * (2 ** (attempt - 1))
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                print(f"⚠️ Batch {i} failed (attempt {attempt}/{MAX_RETRIES}): {error_code}")
                
                if attempt <= MAX_RETRIES:
                    print(f"   Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    print(f"❌ Batch {i} failed permanently")
                    failed += len(chunk)
                    
            except Exception as e:
                print(f"❌ Unexpected error in batch {i}: {e}")
                import traceback
                traceback.print_exc()
                failed += len(chunk)
                break

    # Update checkpoint only if some records were synced
    if synced > 0:
        set_last_checkpoint(iso_now())
        print(f"\n✅ Checkpoint updated to {iso_now()}")

    print(f"\n{'='*60}")
    print(f"📊 SYNC SUMMARY")
    print(f"   Total found: {count}")
    print(f"   Successfully synced: {synced}")
    print(f"   Failed: {failed}")
    print(f"   Success rate: {(synced/count*100):.1f}%" if count > 0 else "N/A")
    print(f"{'='*60}")
    
    return synced


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
        print("\n🔄 Starting attendance sync...")
        attendance_count = sync_attendance()
        
        # 2. Sync AI insights from DynamoDB to MongoDB
        print("\n🔄 Starting insights sync...")
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