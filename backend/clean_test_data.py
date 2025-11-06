"""
Clean dummy test data from attendance collection
Only keep records from registered employees (EMP-001, EMP-002)
"""
from mongo_db import MongoDBManager
from datetime import datetime

db = MongoDBManager().db

print("🧹 Cleaning test/dummy data from attendance collection")
print("=" * 80)

# Get all registered employees
registered_employees = list(db.employees.find({}, {'employee_id': 1}))
registered_ids = [emp['employee_id'] for emp in registered_employees]

print(f"📋 Registered employees in system: {registered_ids}")
print(f"   Total: {len(registered_ids)} employees")

# Get all attendance records
all_attendance = list(db.attendance.find({}))
print(f"\n📊 Total attendance records: {len(all_attendance)}")

# Separate valid and invalid records
valid_records = []
invalid_records = []

for record in all_attendance:
    emp_id = record.get('employee_id')
    if emp_id in registered_ids:
        valid_records.append(record)
    else:
        invalid_records.append(record)

print(f"\n✅ Valid records (from registered employees): {len(valid_records)}")
print(f"❌ Invalid records (test/dummy data): {len(invalid_records)}")

if invalid_records:
    print(f"\n🗑️  Deleting {len(invalid_records)} test/dummy records:")
    
    # Group by employee_id to show summary
    from collections import defaultdict
    by_employee = defaultdict(list)
    for rec in invalid_records:
        emp_id = rec.get('employee_id', 'UNKNOWN')
        by_employee[emp_id].append(rec)
    
    for emp_id, recs in sorted(by_employee.items()):
        print(f"   - {emp_id}: {len(recs)} record(s)")
    
    # Confirm deletion
    print(f"\n⚠️  WARNING: This will permanently delete {len(invalid_records)} records!")
    
    # Delete invalid records
    invalid_ids = [rec['_id'] for rec in invalid_records]
    result = db.attendance.delete_many({'_id': {'$in': invalid_ids}})
    
    print(f"\n✅ Deleted {result.deleted_count} test/dummy records")
else:
    print("\n✅ No test/dummy data found. Database is clean!")

# Verify
remaining = db.attendance.count_documents({})
print(f"\n📊 Total attendance records after cleanup: {remaining}")

# Show remaining records
if remaining > 0:
    print(f"\n📋 Remaining records by employee:")
    for emp_id in registered_ids:
        count = db.attendance.count_documents({'employee_id': emp_id})
        if count > 0:
            print(f"   - {emp_id}: {count} record(s)")

print("=" * 80)
print("✅ Cleanup complete!")
