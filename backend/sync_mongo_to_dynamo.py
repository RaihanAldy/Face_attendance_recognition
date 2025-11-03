import os
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import boto3
from botocore.exceptions import ClientError
from dateutil import parser
from dotenv import load_dotenv
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

session = boto3.Session()
dynamodb = session.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(DYNAMO_TABLE)

mc = MongoClient(MONGODB_URI)
db = mc[DB_NAME]
att = db[ATT_COLLECTION]
checkpoints = db[CHECKPOINT_COLL]

BATCH_SIZE = 25
MAX_RETRIES = 5
BASE_DELAY = 1.0


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
    checkin = doc.get('checkin') or {}
    checkout = doc.get('checkout') or {}

    # pilih timestamp paling relevan untuk sort key
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
    buf = []
    for it in iterable:
        buf.append(it)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf


def batch_write(items):
    with table.batch_writer(overwrite_by_pkeys=['employee_id', 'timestamp']) as batch:
        for it in items:
            batch.put_item(Item=it)


# ------------------------------------
# MAIN LOGIC
# ------------------------------------
def main():
    last_sync = get_last_checkpoint()
    query = {}

    # incremental sync
    if last_sync:
        last_dt = parser.isoparse(last_sync)
        query['updatedAt'] = {'$gt': last_dt}
    else:
        # first sync → last 24 hours
        since = datetime.utcnow() - timedelta(days=1)
        query['updated_at'] = {'$gt': since}

    cursor = att.find(query).sort('updated_at', 1)

    to_sync = []
    for doc in cursor:
        to_sync.append(transform(doc))

    count = len(to_sync)

    if count == 0:
        print("No records to sync")
        set_last_checkpoint(iso_now())
        return

    print(f"Found {count} records to sync")

    # batch sync
    for chunk in chunked(to_sync, BATCH_SIZE):
        attempt = 0
        while attempt <= MAX_RETRIES:
            try:
                batch_write(chunk)
                break
            except ClientError as e:
                attempt += 1
                delay = BASE_DELAY * (2 ** (attempt - 1))
                print(f"Batch failed (attempt {attempt}), retrying in {delay}s → {e}")
                time.sleep(delay)

        if attempt > MAX_RETRIES:
            print("ERROR: failed to write after max retries")
            raise SystemExit(1)

    # update checkpoint
    set_last_checkpoint(iso_now())
    print(f"✅ Successfully synced {count} records to DynamoDB")


if __name__ == '__main__':
    main()
