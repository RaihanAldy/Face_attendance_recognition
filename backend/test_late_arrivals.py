"""
Test late arrivals calculation
"""
from mongo_db import MongoDBManager
from datetime import datetime

db_mgr = MongoDBManager()
db = db_mgr.db

today = datetime.now()
start_of_day = today.replace(hour=0, minute=0, second=0, microsecond=0)
end_of_day = today.replace(hour=23, minute=59, second=59, microsecond=999999)

print(f"Testing late arrivals for: {today.date()}")
print("=" * 60)

# Get all check-ins today
check_ins_today = list(db.attendance.find({
    'timestamp': {'$gte': start_of_day, '$lte': end_of_day},
    'action': 'check-in'
}).sort('timestamp', 1))

print(f"\n📋 Found {len(check_ins_today)} total check-ins today")

# Deduplicate: keep only FIRST check-in per employee
first_checkins = {}
for checkin in check_ins_today:
    emp_id = checkin.get('employee_id')
    if emp_id not in first_checkins:
        first_checkins[emp_id] = checkin

print(f"✅ After deduplication: {len(first_checkins)} unique employees")

# Count how many of these first check-ins were late
late_threshold = start_of_day.replace(hour=9, minute=0)
late_count = 0

print(f"\n🕐 Late threshold: {late_threshold.strftime('%H:%M:%S')}")
print("\nChecking each employee:")
for emp_id, checkin in first_checkins.items():
    timestamp = checkin['timestamp']
    is_late = timestamp > late_threshold
    status = "🔴 LATE" if is_late else "🟢 ON TIME"
    print(f"  {emp_id}: {timestamp.strftime('%H:%M:%S')} - {status}")
    if is_late:
        late_count += 1

print("\n" + "=" * 60)
print(f"📊 RESULT: {late_count} late arrivals out of {len(first_checkins)} employees")
print(f"📊 Percentage: {(late_count/len(first_checkins)*100) if first_checkins else 0:.1f}%")
print("=" * 60)
