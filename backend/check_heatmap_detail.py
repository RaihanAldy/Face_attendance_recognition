"""
Check daily heatmap data breakdown
Show all dates with attendance in November 2025
"""
from mongo_db import MongoDBManager
from datetime import datetime
import calendar

db = MongoDBManager().db

year = 2025
month = 11
days_in_month = calendar.monthrange(year, month)[1]

print("=" * 80)
print(f"📅 DAILY HEATMAP CHECK - NOVEMBER 2025")
print("=" * 80)
print(f"\nNovember 2025 has {days_in_month} days")

# Get all attendance in November
pipeline = [
    {
        '$match': {
            'date': {
                '$gte': f'{year}-{month:02d}-01',
                '$lte': f'{year}-{month:02d}-{days_in_month:02d}'
            }
        }
    },
    {
        '$group': {
            '_id': '$date',
            'count': {'$sum': 1},
            'employees': {'$push': '$employee_id'}
        }
    },
    {'$sort': {'_id': 1}}
]

results = list(db.attendance.aggregate(pipeline))

print(f"\n📊 Days with attendance data: {len(results)}")
print(f"Total check-ins in November: {sum(r['count'] for r in results)}")

print(f"\n📋 Detailed breakdown:")
print("-" * 80)

for result in results:
    date_str = result['_id']
    count = result['count']
    employees = result['employees']
    
    # Get day of week
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    day_name = dt.strftime('%A')
    day_num = dt.day
    
    # Visual bar
    bar = "█" * count
    
    # Employee breakdown
    emp_str = ', '.join(employees)
    
    print(f"{date_str} (Day {day_num:2d} - {day_name:9s}): {bar} {count} | {emp_str}")

# Summary by day of week
print(f"\n📈 Summary by day of week:")
print("-" * 80)

from collections import defaultdict
day_counts = defaultdict(int)

for result in results:
    date_str = result['_id']
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    day_name = dt.strftime('%A')
    day_counts[day_name] += result['count']

days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
for day_name in days_order:
    count = day_counts.get(day_name, 0)
    bar = "█" * (count // 2) if count > 0 else "○"
    print(f"{day_name:9s}: {bar} {count}")

# Check if dates are weekdays or weekends
print(f"\n🔍 Weekend vs Weekday check:")
print("-" * 80)

weekday_count = 0
weekend_count = 0

for result in results:
    date_str = result['_id']
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    count = result['count']
    
    if dt.weekday() >= 5:  # Saturday = 5, Sunday = 6
        weekend_count += count
    else:
        weekday_count += count

print(f"Weekday attendance: {weekday_count}")
print(f"Weekend attendance: {weekend_count}")

print("\n" + "=" * 80)
print("✅ Analysis complete")
