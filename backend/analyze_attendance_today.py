"""
Check where the 22 attendance records came from
"""
from mongo_db import MongoDBManager
from datetime import datetime
from collections import Counter
import json

db = MongoDBManager().db

today = datetime.now().strftime('%Y-%m-%d')
print(f"🔍 Analyzing attendance records for: {today}")
print("=" * 80)

# Get all records for today
records = list(db.attendance.find({'date': today}))

print(f"\n📊 Total records: {len(records)}")

# Breakdown by employee_id
print(f"\n📋 Breakdown by employee_id:")
emp_counts = Counter([r['employee_id'] for r in records])
for emp_id, count in emp_counts.most_common():
    print(f"   {emp_id}: {count} record(s)")

# Show all records with details
print(f"\n📝 All {len(records)} records:")
print("-" * 80)

# Get registered employees for reference
registered_employees = list(db.employees.find({'is_active': True}, {'employee_id': 1, 'name': 1}))
registered_ids = {emp['employee_id']: emp['name'] for emp in registered_employees}

print(f"\n✅ Registered employees ({len(registered_ids)}):")
for emp_id, name in registered_ids.items():
    print(f"   - {emp_id}: {name}")

print(f"\n📊 All attendance records for {today}:")
print("-" * 80)

valid_count = 0
invalid_count = 0

for i, record in enumerate(records, 1):
    emp_id = record.get('employee_id')
    emp_name = record.get('employee_name', 'N/A')
    checkin_status = record.get('checkin', {}).get('status', 'N/A')
    checkin_time = record.get('checkin', {}).get('timestamp', 'N/A')
    
    # Check if employee is registered
    is_registered = emp_id in registered_ids
    status_icon = "✅" if is_registered else "❌"
    
    if is_registered:
        valid_count += 1
    else:
        invalid_count += 1
    
    # Extract time from timestamp
    if isinstance(checkin_time, str) and 'T' in checkin_time:
        time_part = checkin_time.split('T')[1][:8]  # HH:MM:SS
    else:
        time_part = str(checkin_time)[:8] if len(str(checkin_time)) > 8 else checkin_time
    
    print(f"{i:2}. {status_icon} {emp_id:<15} {emp_name:<35} {checkin_status:<8} {time_part}")

print("-" * 80)
print(f"\n📈 Summary:")
print(f"   Valid records (registered employees): {valid_count}")
print(f"   Invalid records (not registered): {invalid_count}")
print(f"   Total: {len(records)}")

# If there are invalid records, show which employee IDs
if invalid_count > 0:
    invalid_ids = [r['employee_id'] for r in records if r['employee_id'] not in registered_ids]
    unique_invalid = set(invalid_ids)
    print(f"\n⚠️  Invalid employee IDs found ({len(unique_invalid)} unique):")
    invalid_counts = Counter(invalid_ids)
    for emp_id, count in invalid_counts.most_common():
        print(f"   - {emp_id}: {count} record(s)")

print("\n" + "=" * 80)
print("✅ Analysis complete")
