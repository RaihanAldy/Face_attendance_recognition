from mongo_db import MongoDBManager
import json

db = MongoDBManager().db

# Search for Ubaidillah in attendance records
ubaid_attendance = list(db.attendance.find({
    'employee_name': {'$regex': 'Ubaidillah', '$options': 'i'}
}))

print(f'Found {len(ubaid_attendance)} attendance records for Ubaidillah')
print('='*80)

if ubaid_attendance:
    # Show first few records
    for i, rec in enumerate(ubaid_attendance[:3], 1):
        print(f'\n--- Attendance Record {i} ---')
        rec_dict = {k: str(v) if k == '_id' else v for k, v in rec.items()}
        print(json.dumps(rec_dict, indent=2, default=str))

    # Get unique employee info
    unique_employees = db.attendance.distinct('employee_id', {
        'employee_name': {'$regex': 'Ubaidillah', '$options': 'i'}
    })
    
    print(f'\n\nUnique employee_id(s) for Ubaidillah: {unique_employees}')
    
    # Check if this employee_id exists in employees collection
    for emp_id in unique_employees:
        exists = db.employees.count_documents({'employee_id': emp_id})
        print(f'Employee {emp_id} exists in employees collection: {exists > 0}')

# Also get all unique employee names from attendance
print('\n' + '='*80)
print('\nAll unique employee names in attendance collection:')
all_names = db.attendance.distinct('employee_name')
for name in sorted(all_names):
    count = db.attendance.count_documents({'employee_name': name})
    print(f'  - {name}: {count} records')
