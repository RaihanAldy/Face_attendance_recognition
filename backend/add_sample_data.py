"""
Add proper sample attendance data for testing dashboard
Creates realistic attendance records for the registered employees
"""
from mongo_db import MongoDBManager
from datetime import datetime, timedelta
import random

db = MongoDBManager().db

print("📝 Adding sample attendance data for dashboard testing")
print("=" * 80)

# Get registered employees
employees = list(db.employees.find({'is_active': True}))
print(f"👥 Active employees: {len(employees)}")
for emp in employees:
    print(f"   - {emp['employee_id']}: {emp['name']}")

# Define date range: last 7 days
today = datetime.now()
date_range = [(today - timedelta(days=i)).date() for i in range(6, -1, -1)]

print(f"\n📅 Creating attendance for date range:")
print(f"   From: {date_range[0]}")
print(f"   To: {date_range[-1]}")

# Sample time ranges for realistic data
checkin_times = [
    (6, 30),   # Early bird
    (7, 15),   # On time
    (7, 45),   # On time
    (8, 20),   # On time
    (8, 50),   # Just on time
    (9, 15),   # Late
    (9, 45),   # Late
]

created_count = 0

for date in date_range:
    for emp in employees:
        # Skip some days randomly (70% attendance rate)
        if random.random() > 0.7:
            continue
        
        # Check if already exists
        existing = db.attendance.find_one({
            'employee_id': emp['employee_id'],
            'date': date.strftime('%Y-%m-%d')
        })
        
        if existing:
            print(f"   ⏭️  Skipping {emp['employee_id']} on {date} (already exists)")
            continue
        
        # Random check-in time
        checkin_hour, checkin_min = random.choice(checkin_times)
        checkin_time = datetime.combine(date, datetime.min.time()).replace(
            hour=checkin_hour, minute=checkin_min, second=random.randint(0, 59)
        )
        
        # Determine check-in status
        if checkin_time.hour < 7:
            checkin_status = 'early'
        elif checkin_time.hour < 9 or (checkin_time.hour == 9 and checkin_time.minute == 0):
            checkin_status = 'ontime'
        else:
            checkin_status = 'late'
        
        # Random work duration (7-10 hours)
        work_minutes = random.randint(7 * 60, 10 * 60)
        checkout_time = checkin_time + timedelta(minutes=work_minutes)
        
        # Determine checkout status
        work_hours = work_minutes / 60
        if work_hours < 8:
            checkout_status = 'early'
        elif work_hours <= 10:
            checkout_status = 'ontime'
        else:
            checkout_status = 'late'  # overtime
        
        # Create attendance record
        record = {
            'employee_id': emp['employee_id'],
            'employee_name': emp['name'],
            'date': date.strftime('%Y-%m-%d'),
            'checkin': {
                'timestamp': checkin_time.isoformat(),
                'status': checkin_status
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
        created_count += 1
        
        status_icon = "🟢" if checkin_status == "ontime" else "🟡" if checkin_status == "early" else "🔴"
        print(f"   {status_icon} {emp['employee_id']} - {date} - {checkin_time.strftime('%H:%M')} ({checkin_status}) - {work_hours:.1f}h")

print(f"\n" + "=" * 80)
print(f"✅ Created {created_count} new attendance records")

# Show summary
total_records = db.attendance.count_documents({})
print(f"📊 Total attendance records in database: {total_records}")

for emp in employees:
    count = db.attendance.count_documents({'employee_id': emp['employee_id']})
    print(f"   - {emp['employee_id']}: {count} record(s)")

print("=" * 80)
print("✅ Sample data creation complete!")
