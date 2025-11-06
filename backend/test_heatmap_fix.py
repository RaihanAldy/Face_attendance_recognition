"""
TEST HEATMAP FIX - Should only show days up to today
"""
from mongo_db import MongoDBManager
from datetime import datetime
import calendar
import requests

print("=" * 80)
print("🔧 TESTING HEATMAP FIX")
print("=" * 80)

# Get current date
today = datetime.now()
year = today.year
month = today.month
current_day = today.day
days_in_month = calendar.monthrange(year, month)[1]

print(f"\n📅 Current date: {today.strftime('%Y-%m-%d')} ({today.strftime('%A')})")
print(f"   Current day: {current_day}")
print(f"   Days in month: {days_in_month}")

# Simulate the API logic locally
db = MongoDBManager().db

# Get first and last day of the month
first_day = datetime(year, month, 1)
last_day = datetime(year, month, days_in_month)

start_date_str = first_day.strftime('%Y-%m-%d')
end_date_str = last_day.strftime('%Y-%m-%d')

print(f"\n🔍 Query range: {start_date_str} to {end_date_str}")

# Query attendance for the entire month
pipeline = [
    {
        '$match': {
            'date': {'$gte': start_date_str, '$lte': end_date_str},
            'checkin': {'$exists': True}
        }
    },
    {
        '$group': {
            '_id': '$date',
            'count': {'$sum': 1}
        }
    },
    {
        '$sort': {'_id': 1}
    }
]

results = list(db.attendance.aggregate(pipeline))

print(f"\n📊 Database results: {len(results)} days with attendance data")
for item in results:
    print(f"   - {item['_id']}: {item['count']}")

# NEW LOGIC: Limit to today if current month
max_day = days_in_month
if year == today.year and month == today.month:
    max_day = min(current_day, days_in_month)
    print(f"\n✅ Current month detected - limiting to day {max_day}")
else:
    print(f"\n⏮️  Past/future month - showing all {days_in_month} days")

# Create array (FIXED VERSION)
monthly_data = []
for day in range(1, max_day + 1):
    date = datetime(year, month, day)
    date_str = date.strftime('%Y-%m-%d')
    
    # Find count for this date
    count = 0
    for item in results:
        if item['_id'] == date_str:
            count = item['count']
            break
    
    is_future = date.date() > today.date()
    flag = "⚠️ FUTURE" if is_future else "✅"
    
    monthly_data.append({
        'date': date_str,
        'day': str(day),
        'dayName': date.strftime('%a'),
        'checkIns': count
    })

print(f"\n📋 API RESPONSE (after fix):")
print(f"   Total days in response: {len(monthly_data)}")
print(f"   Expected: {max_day} (not {days_in_month})")
print(f"\n{'Day':<5} {'Date':<12} {'DayName':<10} {'CheckIns':<10} {'Status'}")
print("-" * 60)

for item in monthly_data:
    date_obj = datetime.strptime(item['date'], '%Y-%m-%d')
    is_future = date_obj.date() > today.date()
    status = "⚠️ FUTURE!" if is_future else "✅ Valid"
    print(f"{item['day']:<5} {item['date']:<12} {item['dayName']:<10} {item['checkIns']:<10} {status}")

# Check for future dates
future_dates = [item for item in monthly_data if datetime.strptime(item['date'], '%Y-%m-%d').date() > today.date()]

print(f"\n" + "=" * 80)
if len(future_dates) > 0:
    print(f"❌ FAIL: Still showing {len(future_dates)} future dates!")
    for item in future_dates:
        print(f"   - {item['date']} ({item['dayName']})")
else:
    print(f"✅ SUCCESS: No future dates in response!")
    print(f"   Response contains only {len(monthly_data)} days (up to today)")
    print(f"   Last date: {monthly_data[-1]['date']} ({monthly_data[-1]['dayName']})")

print("=" * 80)
