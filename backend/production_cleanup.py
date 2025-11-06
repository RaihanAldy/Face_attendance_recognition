"""
PRODUCTION CLEANUP - Remove test/dummy data permanently
This will clean the database for real production use
"""
from mongo_db import MongoDBManager
from datetime import datetime
from collections import Counter

db = MongoDBManager().db

print("=" * 80)
print("🧹 PRODUCTION DATABASE CLEANUP")
print("=" * 80)

# Get registered employees
registered_employees = list(db.employees.find({'is_active': True}, {'employee_id': 1, 'name': 1}))
registered_ids = [emp['employee_id'] for emp in registered_employees]

print(f"\n✅ Registered employees ({len(registered_ids)}):")
for emp in registered_employees:
    print(f"   - {emp['employee_id']}: {emp['name']}")

# Get all attendance records
all_records = list(db.attendance.find({}))
print(f"\n📊 Current database state:")
print(f"   Total attendance records: {len(all_records)}")

# Categorize records
valid_records = []
invalid_records = []
duplicate_records = {}

for record in all_records:
    emp_id = record.get('employee_id')
    date = record.get('date')
    
    if emp_id not in registered_ids:
        # Invalid: not a registered employee
        invalid_records.append(record)
    else:
        # Valid employee, check for duplicates
        key = f"{emp_id}_{date}"
        if key not in duplicate_records:
            duplicate_records[key] = []
        duplicate_records[key].append(record)

# Find actual duplicates (more than 1 record per employee per day)
actual_duplicates = []
for key, records in duplicate_records.items():
    if len(records) > 1:
        # Sort by _id (ObjectId has timestamp), keep latest
        records.sort(key=lambda x: x['_id'], reverse=True)
        # Mark older records as duplicates
        actual_duplicates.extend(records[1:])

print(f"\n🔍 Analysis:")
print(f"   Valid records (registered employees): {len(all_records) - len(invalid_records) - len(actual_duplicates)}")
print(f"   Invalid records (test/dummy data): {len(invalid_records)}")
print(f"   Duplicate records (older entries): {len(actual_duplicates)}")

# Show what will be deleted
if invalid_records:
    print(f"\n❌ INVALID RECORDS TO DELETE ({len(invalid_records)}):")
    invalid_counts = Counter([r['employee_id'] for r in invalid_records])
    for emp_id, count in invalid_counts.most_common():
        print(f"   - {emp_id}: {count} record(s)")

if actual_duplicates:
    print(f"\n🔄 DUPLICATE RECORDS TO DELETE ({len(actual_duplicates)}):")
    for dup in actual_duplicates:
        emp_id = dup['employee_id']
        date = dup['date']
        checkin_time = dup.get('checkin', {}).get('timestamp', 'N/A')
        print(f"   - {emp_id} on {date} at {checkin_time[:19] if len(checkin_time) > 19 else checkin_time}")

# Confirm deletion
total_to_delete = len(invalid_records) + len(actual_duplicates)
print(f"\n⚠️  WARNING: About to PERMANENTLY DELETE {total_to_delete} records!")
print(f"   - {len(invalid_records)} test/dummy records")
print(f"   - {len(actual_duplicates)} duplicate records")
print(f"\n✅ Will keep: {len(all_records) - total_to_delete} valid records")

# DELETE OPERATIONS
if invalid_records:
    invalid_ids = [rec['_id'] for rec in invalid_records]
    result1 = db.attendance.delete_many({'_id': {'$in': invalid_ids}})
    print(f"\n✅ Deleted {result1.deleted_count} test/dummy records")

if actual_duplicates:
    duplicate_ids = [rec['_id'] for rec in actual_duplicates]
    result2 = db.attendance.delete_many({'_id': {'$in': duplicate_ids}})
    print(f"✅ Deleted {result2.deleted_count} duplicate records")

# Verify cleanup
remaining = db.attendance.count_documents({})
print(f"\n📊 Final database state:")
print(f"   Total attendance records: {remaining}")

# Show breakdown by employee
print(f"\n📋 Records by employee:")
for emp in registered_employees:
    count = db.attendance.count_documents({'employee_id': emp['employee_id']})
    print(f"   - {emp['employee_id']} ({emp['name']}): {count} record(s)")

# Verify no invalid records remain
invalid_remaining = db.attendance.count_documents({
    'employee_id': {'$nin': registered_ids}
})
if invalid_remaining > 0:
    print(f"\n⚠️  WARNING: {invalid_remaining} invalid records still remain!")
else:
    print(f"\n✅ SUCCESS: No invalid records remaining!")

# Verify no duplicates remain
from collections import defaultdict
records_by_emp_date = defaultdict(int)
all_remaining = list(db.attendance.find({}))
for rec in all_remaining:
    key = f"{rec['employee_id']}_{rec['date']}"
    records_by_emp_date[key] += 1

duplicates_remaining = sum(1 for count in records_by_emp_date.values() if count > 1)
if duplicates_remaining > 0:
    print(f"⚠️  WARNING: {duplicates_remaining} duplicate date/employee pairs still remain!")
else:
    print(f"✅ SUCCESS: No duplicates remaining!")

print("\n" + "=" * 80)
print("✅ PRODUCTION CLEANUP COMPLETE!")
print("   Database is now ready for real-world use")
print("=" * 80)
