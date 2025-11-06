"""
DEBUG: Check what data is actually sent to frontend
Compare with what should be displayed
"""
from mongo_db import MongoDBManager
from datetime import datetime
import calendar

db = MongoDBManager().db

print("=" * 80)
print("🔍 DEBUGGING HEATMAP CALENDAR")
print("=" * 80)

today = datetime.now()
year = today.year
month = today.month
current_day = today.day
days_in_month = calendar.monthrange(year, month)[1]

print(f"\n📅 Today: {today.strftime('%Y-%m-%d %A')}")
print(f"   Current day: {current_day}")
print(f"   Days in month: {days_in_month}")

# Check what dates should exist
print(f"\n📋 DATES THAT SHOULD APPEAR (Nov 1-{current_day}):")
print("-" * 80)
for day in range(1, current_day + 1):
    date = datetime(year, month, day)
    date_str = date.strftime('%Y-%m-%d')
    day_name = date.strftime('%A')
    
    # Check if this date has attendance data
    count = db.attendance.count_documents({
        'date': date_str,
        'checkin': {'$exists': True}
    })
    
    status = "✅ HAS DATA" if count > 0 else "⚠️  NO DATA (but should still show!)"
    print(f"   {day:2d}. {date_str} ({day_name}): {count} attendance - {status}")

# Now simulate what API returns
print(f"\n" + "=" * 80)
print("🔧 SIMULATING API RESPONSE:")
print("=" * 80)

first_day = datetime(year, month, 1)
start_date_str = first_day.strftime('%Y-%m-%d')
end_date_str = datetime(year, month, days_in_month).strftime('%Y-%m-%d')

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

print(f"Database query returned {len(results)} dates with data:")
for item in results:
    print(f"   - {item['_id']}: {item['count']}")

# Build response array (CURRENT LOGIC)
max_day = current_day  # Already limited to today in the fix

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
    
    monthly_data.append({
        'date': date_str,
        'day': str(day),
        'dayName': date.strftime('%a'),
        'checkIns': count
    })

print(f"\n📤 API will send {len(monthly_data)} items:")
print(f"\n{'Index':<7} {'Day':<5} {'Date':<12} {'DayName':<10} {'CheckIns':<10}")
print("-" * 60)
for i, item in enumerate(monthly_data):
    print(f"{i:<7} {item['day']:<5} {item['date']:<12} {item['dayName']:<10} {item['checkIns']:<10}")

# Check for missing days
print(f"\n" + "=" * 80)
print("🔍 CHECKING FOR MISSING DAYS:")
print("=" * 80)

missing_days = []
for day in range(1, current_day + 1):
    date_str = datetime(year, month, day).strftime('%Y-%m-%d')
    found = False
    for item in monthly_data:
        if item['date'] == date_str:
            found = True
            break
    
    if not found:
        missing_days.append(day)

if missing_days:
    print(f"❌ MISSING DAYS: {missing_days}")
    for day in missing_days:
        date = datetime(year, month, day)
        print(f"   - Day {day}: {date.strftime('%Y-%m-%d %A')}")
else:
    print(f"✅ All days present (1-{current_day})")

# Check the visual layout
print(f"\n" + "=" * 80)
print("📊 VISUAL CALENDAR LAYOUT:")
print("=" * 80)

# Get first day of month to calculate padding
first_day_of_month = datetime(year, month, 1)
first_weekday = first_day_of_month.weekday()  # 0=Mon, 6=Sun
# Convert to Sunday-based (0=Sun)
first_day_index = (first_weekday + 1) % 7

print(f"First day of month: {first_day_of_month.strftime('%A')} (padding: {first_day_index} cells)")

# Print calendar header
print(f"\n   Sun  Mon  Tue  Wed  Thu  Fri  Sat")
print("   " + "-" * 35)

# Print calendar
current_col = 0

# Add padding
for _ in range(first_day_index):
    print("     ", end="")
    current_col += 1

# Print days
for item in monthly_data:
    day_num = int(item['day'])
    check_ins = item['checkIns']
    
    # Format: "DD(C)" where C is check-ins count
    cell = f"{day_num:2d}({check_ins})"
    print(f"{cell:>4} ", end="")
    
    current_col += 1
    if current_col % 7 == 0:
        print()  # New line after Saturday
        current_col = 0

print("\n")
print("=" * 80)
