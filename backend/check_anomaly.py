"""
Check attendance anomaly for today
"""
from mongo_db import MongoDBManager
from datetime import datetime

db = MongoDBManager().db

# Get today's date
today = datetime.now().strftime('%Y-%m-%d')
print(f"🔍 Checking anomaly for: {today}")
print("=" * 80)

# Get all records for today
records = list(db.attendance.find({'date': today}))
print(f"\n📊 Total records today: {len(records)}")

# Get total employees
total_employees = db.employees.count_documents({'is_active': True})
print(f"👥 Total active employees: {total_employees}")

# Check for duplicates
employee_ids = [r.get('employee_id') for r in records]
unique_employees = set(employee_ids)
print(f"🔢 Unique employees today: {len(unique_employees)}")

if len(records) > len(unique_employees):
    print(f"\n⚠️  DUPLICATE DETECTED! {len(records) - len(unique_employees)} duplicate records")
    
    # Find duplicates
    from collections import Counter
    counts = Counter(employee_ids)
    duplicates = {emp_id: count for emp_id, count in counts.items() if count > 1}
    
    print(f"\n📋 Employees with duplicates:")
    for emp_id, count in duplicates.items():
        print(f"   - {emp_id}: {count} records")
        emp_records = [r for r in records if r.get('employee_id') == emp_id]
        for i, r in enumerate(emp_records, 1):
            checkin_time = r.get('checkin', {}).get('timestamp', 'N/A')
            print(f"      {i}. CheckIn: {checkin_time}, Status: {r.get('checkin', {}).get('status')}")

# Check late arrivals
late_records = [r for r in records if r.get('checkin', {}).get('status') == 'late']
print(f"\n⏰ Late arrivals: {len(late_records)}")

# Sample first 10 records
print(f"\n📝 First 10 records:")
for i, r in enumerate(records[:10], 1):
    emp_id = r.get('employee_id')
    checkin = r.get('checkin', {})
    status = checkin.get('status', 'N/A')
    timestamp = checkin.get('timestamp', 'N/A')
    print(f"{i:2d}. {emp_id} - {status:7s} - {timestamp}")

print("\n" + "=" * 80)
