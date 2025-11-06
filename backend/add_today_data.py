"""
Add attendance records specifically for today
"""
from mongo_db import MongoDBManager
from datetime import datetime, timedelta
import random

db = MongoDBManager().db

print("📝 Adding attendance records for TODAY")
print("=" * 80)

today = datetime.now().date()
print(f"📅 Date: {today}")

# Get active employees
employees = list(db.employees.find({'is_active': True}))

for emp in employees:
    # Check if already exists
    existing = db.attendance.find_one({
        'employee_id': emp['employee_id'],
        'date': today.strftime('%Y-%m-%d')
    })
    
    if existing:
        print(f"   ✅ {emp['employee_id']} already has attendance for today")
        continue
    
    # Create realistic check-in time for today
    checkin_times = [
        (7, 15, 'ontime'),   # On time
        (8, 20, 'ontime'),   # On time
        (9, 30, 'late'),     # Late
    ]
    
    checkin_hour, checkin_min, status = random.choice(checkin_times)
    checkin_time = datetime.combine(today, datetime.min.time()).replace(
        hour=checkin_hour, minute=checkin_min, second=random.randint(0, 59)
    )
    
    # Work duration 8-9 hours
    work_minutes = random.randint(8 * 60, 9 * 60)
    checkout_time = checkin_time + timedelta(minutes=work_minutes)
    
    work_hours = work_minutes / 60
    if work_hours < 8:
        checkout_status = 'early'
    elif work_hours <= 10:
        checkout_status = 'ontime'
    else:
        checkout_status = 'late'
    
    record = {
        'employee_id': emp['employee_id'],
        'employee_name': emp['name'],
        'date': today.strftime('%Y-%m-%d'),
        'checkin': {
            'timestamp': checkin_time.isoformat(),
            'status': status
        },
        'checkout': {
            'timestamp': checkout_time.isoformat(),
            'status': checkout_status
        },
        'work_duration_minutes': work_minutes,
        'createdAt': datetime.now(),
        'updatedAt': datetime.now()
    }
    
    db.attendance.insert_one(record)
    
    status_icon = "🟢" if status == "ontime" else "🔴"
    print(f"   {status_icon} Added {emp['employee_id']} - {checkin_time.strftime('%H:%M')} ({status}) - {work_hours:.1f}h")

# Show summary for today
from datetime import timedelta
total_today = db.attendance.count_documents({'date': today.strftime('%Y-%m-%d')})
late_today = db.attendance.count_documents({
    'date': today.strftime('%Y-%m-%d'),
    'checkin.status': 'late'
})

print(f"\n" + "=" * 80)
print(f"📊 Summary for {today}:")
print(f"   - Total attendance: {total_today}")
print(f"   - Late arrivals: {late_today}")
print(f"   - On time: {total_today - late_today}")

# Calculate average working duration for today
pipeline = [
    {'$match': {'date': today.strftime('%Y-%m-%d')}},
    {'$group': {
        '_id': None,
        'avg_minutes': {'$avg': '$work_duration_minutes'}
    }}
]
result = list(db.attendance.aggregate(pipeline))
if result:
    avg_hours = result[0]['avg_minutes'] / 60
    print(f"   - Average working duration: {avg_hours:.1f} hours")

print("=" * 80)
print("✅ Today's attendance is ready!")
