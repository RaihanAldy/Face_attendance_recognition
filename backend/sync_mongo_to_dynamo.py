import os
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import boto3
from botocore.exceptions import ClientError
from dateutil import parser

# ------------------------------------
# CONFIG
# ------------------------------------
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'attendance_system')
ATT_COLLECTION = os.getenv('ATT_COLLECTION', 'attendance')
CHECKPOINT_COLL = os.getenv('CHECKPOINT_COLL', 'sync_checkpoints')
DYNAMO_TABLE = os.getenv('DYNAMO_TABLE', 'attendance_metadata')
AWS_REGION = os.getenv('AWS_REGION', 'ap-southeast-2')

session = boto3.Session()
dynamodb = session.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(DYNAMO_TABLE)

mc = MongoClient(MONGO_URI)
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
    ts = doc.get('timestamp')
    ts_iso = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

    return {
        'PK': doc['employee_id'],
        'SK': ts_iso,
        'employees': doc.get('employees', ''),
        'department': doc.get('department', ''),
        'date': doc.get('date', ''),
        'day_of_week': doc.get('day_of_week', ''),
        'action': doc.get('action', ''),
        'status': doc.get('status', ''),
        'lateness_minutes': int(doc.get('lateness_minutes', 0)),
        'work_duration': int(doc.get('work_duration', 0)),
        'confidence': float(doc.get('confidence', 0.0)),
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
    with table.batch_writer(overwrite_by_pkeys=['PK', 'SK']) as batch:
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
        query['updated_at'] = {'$gt': last_dt}
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
