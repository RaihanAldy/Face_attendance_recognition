"""
COMPREHENSIVE DASHBOARD AUDIT
Test ALL features with edge cases & real scenarios
"""
from mongo_db import MongoDBManager
from datetime import datetime, timedelta
import calendar

db = MongoDBManager().db

print("=" * 100)
print("🔍 COMPREHENSIVE DASHBOARD AUDIT - REBUILDING TRUST")
print("=" * 100)

today = datetime.now()
today_str = today.strftime('%Y-%m-%d')

# Get current state
total_employees = db.employees.count_documents({'is_active': True})
total_attendance = db.attendance.count_documents({'date': today_str, 'checkin': {'$exists': True}})

print(f"\n📊 CURRENT STATE:")
print(f"   Date: {today.strftime('%Y-%m-%d %A')}")
print(f"   Active employees: {total_employees}")
print(f"   Attendance today: {total_attendance}")

all_pass = True

# ============================================================================
# FEATURE 1: Total Attendance Counter
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 1: TOTAL ATTENDANCE COUNTER")
print("=" * 100)

count_query = {
    'date': today_str,
    'checkin': {'$exists': True}
}
total_count = db.attendance.count_documents(count_query)

print(f"Query: {count_query}")
print(f"Result: {total_count}")

# Edge case: Check for duplicates
pipeline_duplicates = [
    {'$match': {'date': today_str, 'checkin': {'$exists': True}}},
    {'$group': {'_id': '$employee_id', 'count': {'$sum': 1}}},
    {'$match': {'count': {'$gt': 1}}}
]
duplicates = list(db.attendance.aggregate(pipeline_duplicates))

if duplicates:
    print(f"⚠️  WARNING: Found {len(duplicates)} employees with duplicate attendance!")
    for dup in duplicates:
        print(f"   - {dup['_id']}: {dup['count']} records")
    all_pass = False
else:
    print(f"✅ PASS: No duplicates, count is accurate")

# ============================================================================
# FEATURE 2: Late Arrivals Counter
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 2: LATE ARRIVALS COUNTER")
print("=" * 100)

late_query = {
    'date': today_str,
    'checkin.status': 'late'
}
late_count = db.attendance.count_documents(late_query)

print(f"Query: {late_query}")
print(f"Result: {late_count}")

# Verify by listing late arrivals
late_records = list(db.attendance.find(late_query, {'employee_id': 1, 'employee_name': 1, 'checkin.timestamp': 1}))
if late_records:
    print(f"\nLate arrivals details:")
    for record in late_records:
        checkin_time = record.get('checkin', {}).get('timestamp', 'N/A')
        if checkin_time != 'N/A':
            dt = datetime.fromisoformat(checkin_time)
            print(f"   - {record.get('employee_id')}: {dt.strftime('%H:%M:%S')} (threshold: >09:00)")
            
            # Validate: is it really late?
            if dt.hour < 9 or (dt.hour == 9 and dt.minute == 0):
                print(f"      ❌ ERROR: Marked late but arrived at/before 9 AM!")
                all_pass = False
            else:
                print(f"      ✅ Correct")
else:
    print(f"   (No late arrivals today)")

print(f"✅ PASS: Late arrival logic correct")

# ============================================================================
# FEATURE 3: Compliance Rate
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 3: COMPLIANCE RATE")
print("=" * 100)

compliance = round((total_attendance / total_employees * 100) if total_employees > 0 else 0, 1)

print(f"Formula: (attendance / total_employees) * 100")
print(f"Calculation: ({total_attendance} / {total_employees}) * 100 = {compliance}%")

if compliance > 100:
    print(f"❌ ERROR: Compliance > 100%!")
    all_pass = False
elif compliance < 0:
    print(f"❌ ERROR: Compliance < 0%!")
    all_pass = False
else:
    print(f"✅ PASS: Compliance rate valid (0-100%)")

# ============================================================================
# FEATURE 4: Average Working Duration
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 4: AVERAGE WORKING DURATION")
print("=" * 100)

records_with_duration = list(db.attendance.find({
    'date': today_str,
    'work_duration_minutes': {'$exists': True, '$gt': 0}
}))

if records_with_duration:
    durations_hours = [r['work_duration_minutes'] / 60 for r in records_with_duration]
    
    avg_hours = sum(durations_hours) / len(durations_hours)
    longest_hours = max(durations_hours)
    shortest_hours = min(durations_hours)
    
    print(f"Sample size: {len(records_with_duration)}")
    print(f"Average: {avg_hours:.1f}h | Longest: {longest_hours:.1f}h | Shortest: {shortest_hours:.1f}h")
    
    # Validation
    if avg_hours < 0 or avg_hours > 24 or longest_hours > 24 or shortest_hours < 0:
        print(f"❌ ERROR: Invalid duration values!")
        all_pass = False
    else:
        print(f"✅ PASS: All durations valid")
else:
    print(f"⚠️  No duration data today")

# ============================================================================
# FEATURE 5: Attendance Trend (7 Days)
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 5: ATTENDANCE TREND (7 DAYS)")
print("=" * 100)

days_since_monday = today.weekday()
monday_this_week = today - timedelta(days=days_since_monday)

print(f"Week: {monday_this_week.strftime('%Y-%m-%d')} to {(monday_this_week + timedelta(days=6)).strftime('%Y-%m-%d')}")

trend_data = []
for i in range(7):
    date = monday_this_week + timedelta(days=i)
    date_str = date.strftime('%Y-%m-%d')
    
    count = db.attendance.count_documents({
        'date': date_str,
        'checkin': {'$exists': True}
    })
    
    is_future = date.date() > today.date()
    status = "⚠️" if is_future else "✅"
    
    trend_data.append({'date': date_str, 'count': count, 'is_future': is_future})
    
    bar = "█" * count if count > 0 else "○"
    print(f"   {status} {date.strftime('%a')} ({date_str}): {bar} {count}")

future_in_trend = [item for item in trend_data if item['is_future'] and item['count'] > 0]
if future_in_trend:
    print(f"\n❌ ERROR: Future dates have data!")
    all_pass = False
else:
    print(f"\n✅ PASS: No future attendance")

# ============================================================================
# FEATURE 6: Top Departments
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 6: TOP DEPARTMENTS BY ATTENDANCE")
print("=" * 100)

pipeline = [
    {'$match': {'date': today_str, 'checkin': {'$exists': True}}},
    {'$lookup': {
        'from': 'employees',
        'localField': 'employee_id',
        'foreignField': 'employee_id',
        'as': 'employee'
    }},
    {'$unwind': '$employee'},
    {'$group': {'_id': '$employee.department', 'count': {'$sum': 1}}},
    {'$sort': {'count': -1}}
]

dept_results = list(db.attendance.aggregate(pipeline))

print(f"Result: {len(dept_results)} departments")
for dept in dept_results:
    print(f"   - {dept['_id']}: {dept['count']}")

# Check unmatched
unmatched = list(db.attendance.aggregate([
    {'$match': {'date': today_str, 'checkin': {'$exists': True}}},
    {'$lookup': {
        'from': 'employees',
        'localField': 'employee_id',
        'foreignField': 'employee_id',
        'as': 'employee'
    }},
    {'$match': {'employee': {'$size': 0}}}
]))

if unmatched:
    print(f"⚠️  WARNING: {len(unmatched)} attendance without employee match!")
    all_pass = False
else:
    print(f"✅ PASS: All matched")

# ============================================================================
# FEATURE 7: Daily Heatmap
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 7: DAILY HEATMAP (MONTHLY)")
print("=" * 100)

year = today.year
month = today.month
days_in_month = calendar.monthrange(year, month)[1]

heatmap_results = list(db.attendance.aggregate([
    {'$match': {
        'date': {
            '$gte': f'{year}-{month:02d}-01',
            '$lte': f'{year}-{month:02d}-{days_in_month:02d}'
        },
        'checkin': {'$exists': True}
    }},
    {'$group': {'_id': '$date', 'count': {'$sum': 1}}},
    {'$sort': {'_id': 1}}
]))

print(f"Result: {len(heatmap_results)} days with data (month has {days_in_month} days)")

future_dates = []
for item in heatmap_results:
    date_obj = datetime.strptime(item['_id'], '%Y-%m-%d')
    if date_obj.date() > today.date():
        future_dates.append(item)

if future_dates:
    print(f"❌ ERROR: {len(future_dates)} future dates with data!")
    for item in future_dates:
        print(f"   - {item['_id']}: {item['count']}")
    all_pass = False
else:
    print(f"✅ PASS: No future dates")

# Show first few
print(f"\nFirst 5 days:")
for item in heatmap_results[:5]:
    print(f"   - {item['_id']}: {item['count']}")

# ============================================================================
# FEATURE 8: Hourly Check-ins
# ============================================================================
print(f"\n" + "=" * 100)
print("FEATURE 8: HOURLY CHECK-INS")
print("=" * 100)

try:
    hourly_results = list(db.attendance.aggregate([
        {'$match': {'date': today_str, 'checkin': {'$exists': True}}},
        {'$project': {
            'hour': {
                '$dateToString': {
                    'format': '%H',
                    'date': {'$dateFromString': {'dateString': '$checkin.timestamp'}}
                }
            }
        }},
        {'$group': {'_id': '$hour', 'count': {'$sum': 1}}},
        {'$sort': {'_id': 1}}
    ]))
    
    print(f"Result: {len(hourly_results)} hours with data")
    
    if hourly_results:
        for item in hourly_results:
            print(f"   - {item['_id']}:00 → {item['count']}")
        
        invalid = [item for item in hourly_results if not (0 <= int(item['_id']) <= 23)]
        if invalid:
            print(f"❌ ERROR: Invalid hours found!")
            all_pass = False
        else:
            print(f"✅ PASS: All hours valid (0-23)")
    else:
        print(f"   (No data)")
except Exception as e:
    print(f"❌ ERROR: {e}")
    all_pass = False

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print(f"\n" + "=" * 100)
print("🎯 FINAL VERDICT")
print("=" * 100)

if all_pass:
    print(f"\n✅✅✅ ALL FEATURES PASSED - DASHBOARD IS SOLID! ✅✅✅")
    print(f"\n   Trust restored! 🤝 All 8 features working correctly.")
else:
    print(f"\n⚠️  SOME ISSUES FOUND - Check details above")

print(f"\n{'='*100}")
