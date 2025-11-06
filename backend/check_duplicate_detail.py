from mongo_db import MongoDBManager
import json

db = MongoDBManager().db

# Check all employees with all possible name fields
employees = list(db.employees.find({}))

print(f'Total documents in employees collection: {len(employees)}')
print('='*80)

for i, emp in enumerate(employees, 1):
    print(f'\n--- Employee {i} ---')
    print(f'_id: {emp.get("_id")}')
    print(f'employee_id: {emp.get("employee_id", "NOT FOUND")}')
    
    # Check all possible name fields
    print(f'name: {emp.get("name", "NOT FOUND")}')
    print(f'employee_name: {emp.get("employee_name", "NOT FOUND")}')
    print(f'full_name: {emp.get("full_name", "NOT FOUND")}')
    
    print(f'is_active: {emp.get("is_active", "NOT FOUND")}')
    print(f'department: {emp.get("department", "NOT FOUND")}')
    print(f'position: {emp.get("position", "NOT FOUND")}')
    
    # Show all keys in the document
    print(f'\nAll fields in document: {list(emp.keys())}')

print('\n' + '='*80)
print(f'\nTotal employees: {len(employees)}')
print(f'Active employees: {db.employees.count_documents({"is_active": True})}')

# Search specifically for "Ubaidillah"
print('\n--- Searching for Ubaidillah ---')
ubaid_results = list(db.employees.find({
    '$or': [
        {'name': {'$regex': 'Ubaidillah', '$options': 'i'}},
        {'employee_name': {'$regex': 'Ubaidillah', '$options': 'i'}},
        {'full_name': {'$regex': 'Ubaidillah', '$options': 'i'}}
    ]
}))

print(f'Found {len(ubaid_results)} employee(s) with name containing "Ubaidillah"')
for emp in ubaid_results:
    print(json.dumps({k: str(v) if k == '_id' else v for k, v in emp.items()}, indent=2, default=str))
