"""
Quick script to check today's attendance data
"""
from mongo_db import MongoDBManager
from datetime import datetime

db_manager = MongoDBManager()
db = db_manager.db

# Get today's date
today = datetime.now().date()
print(f"Checking data for: {today}")
print("=" * 60)

# Get today's check-ins
check_ins = list(db.attendance.find({
    'action': 'check-in'
}).sort('timestamp', -1).limit(20))

print(f"\n📋 Last 20 check-ins:")
for record in check_ins:
    timestamp = record.get('timestamp')
    if isinstance(timestamp, datetime):
        date = timestamp.date()
        time = timestamp.strftime('%H:%M:%S')
        is_today = "🟢 TODAY" if date == today else f"   {date}"
        late_status = "🔴 LATE" if timestamp.hour >= 9 else "🟢 ON TIME"
        print(f"{is_today} - {time} - Employee: {record.get('employee_id')} - {late_status}")
    else:
        print(f"   ??? - {timestamp} - Employee: {record.get('employee_id')}")

print("\n" + "=" * 60)
