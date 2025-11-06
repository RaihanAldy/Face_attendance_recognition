"""
CHECK FUTURE DATA BUG
User caught that heatmap shows data for future dates (Sat, Sun, next Tue)
This should NOT happen - investigate!
"""
from mongo_db import MongoDBManager
from datetime import datetime
import calendar

db = MongoDBManager().db

print("=" * 80)
print("🐛 CHECKING FUTURE DATA BUG")
print("=" * 80)

# Current date/time
now = datetime.now()
today_str = now.strftime('%Y-%m-%d')
print(f"\n📅 Current date/time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"   Day of week: {now.strftime('%A')}")

# Get ALL attendance data for November 2025
year = 2025
month = 11

print(f"\n📊 ALL ATTENDANCE DATA IN NOVEMBER 2025:")
print("-" * 80)

all_attendance = list(db.attendance.find({
    'date': {'$regex': f'^{year}-{month:02d}'}
}).sort('date', 1))

print(f"Total records: {len(all_attendance)}")
print(f"\n{'Date':<12} {'Day':<10} {'Employee':<15} {'Status':<10} {'Future?'}")
print("-" * 80)

for record in all_attendance:
    record_date = datetime.strptime(record['date'], '%Y-%m-%d')
    day_name = record_date.strftime('%A')
    employee_id = record.get('employee_id', 'N/A')
    checkin_status = record.get('checkin', {}).get('status', 'N/A')
    
    # Check if date is in the future
    is_future = record_date.date() > now.date()
    future_flag = "⚠️ FUTURE!" if is_future else ""
    
    print(f"{record['date']:<12} {day_name:<10} {employee_id:<15} {checkin_status:<10} {future_flag}")

# Count future dates
future_records = [r for r in all_attendance if datetime.strptime(r['date'], '%Y-%m-%d').date() > now.date()]

print(f"\n" + "=" * 80)
print(f"🚨 PROBLEM FOUND:")
print(f"   Total future records: {len(future_records)}")

if len(future_records) > 0:
    print(f"\n   Future dates detected:")
    for record in future_records:
        record_date = datetime.strptime(record['date'], '%Y-%m-%d')
        print(f"   - {record['date']} ({record_date.strftime('%A')}) - {record.get('employee_id')}")
    
    print(f"\n   ❌ BUG CONFIRMED: Heatmap showing future attendance!")
    print(f"   Root cause: Test script added data for tomorrow (2025-11-07)")
    print(f"   Impact: Dashboard shows misleading future data")
else:
    print(f"   ✅ No future data found")

print("=" * 80)

# Check what dashboard API would return
print(f"\n🔍 WHAT HEATMAP API RETURNS:")
print("-" * 80)

pipeline = [
    {
        '$match': {
            'date': {
                '$gte': f'{year}-{month:02d}-01',
                '$lte': f'{year}-{month:02d}-30'
            },
            'checkin': {'$exists': True}
        }
    },
    {'$group': {'_id': '$date', 'count': {'$sum': 1}}},
    {'$sort': {'_id': 1}}
]

heatmap_data = list(db.attendance.aggregate(pipeline))

print(f"Heatmap would show {len(heatmap_data)} days with data:")
for item in heatmap_data:
    date_obj = datetime.strptime(item['_id'], '%Y-%m-%d')
    day_name = date_obj.strftime('%A')
    is_future = date_obj.date() > now.date()
    flag = "⚠️" if is_future else "✅"
    print(f"   {flag} {item['_id']} ({day_name}): {item['count']} attendance")

print("\n" + "=" * 80)
print("💡 RECOMMENDATION:")
print("   Dashboard API should filter: date <= TODAY")
print("   Add validation: Prevent recording future attendance")
print("=" * 80)
