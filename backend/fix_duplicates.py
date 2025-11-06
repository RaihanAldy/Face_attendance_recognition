"""
Fix duplicate attendance records for today
Keeps only the LATEST check-in per employee
"""
from mongo_db import MongoDBManager
from datetime import datetime

db = MongoDBManager().db

# Get today's date
today = datetime.now().strftime('%Y-%m-%d')
print(f"🔧 Fixing duplicates for: {today}")
print("=" * 80)

# Get all records for today
records = list(db.attendance.find({'date': today}))
print(f"📊 Total records before cleanup: {len(records)}")

# Group by employee_id
from collections import defaultdict
employee_records = defaultdict(list)

for record in records:
    emp_id = record.get('employee_id')
    employee_records[emp_id].append(record)

# Find and delete duplicates (keep latest based on _id)
deleted_count = 0
kept_count = 0

for emp_id, emp_records in employee_records.items():
    if len(emp_records) > 1:
        # Sort by _id (newer ObjectId = later timestamp)
        emp_records.sort(key=lambda x: x['_id'], reverse=True)
        
        # Keep the first (latest), delete the rest
        keep_record = emp_records[0]
        delete_records = emp_records[1:]
        
        print(f"\n👤 {emp_id}: {len(emp_records)} records found")
        print(f"   ✅ Keeping: {keep_record['_id']} - {keep_record.get('checkin', {}).get('status')}")
        
        for del_record in delete_records:
            print(f"   ❌ Deleting: {del_record['_id']} - {del_record.get('checkin', {}).get('status')}")
            db.attendance.delete_one({'_id': del_record['_id']})
            deleted_count += 1
        
        kept_count += 1
    else:
        kept_count += 1

print(f"\n" + "=" * 80)
print(f"✅ Cleanup complete!")
print(f"   - Records kept: {kept_count}")
print(f"   - Records deleted: {deleted_count}")

# Verify
remaining = db.attendance.count_documents({'date': today})
print(f"   - Total records after cleanup: {remaining}")
print("=" * 80)
