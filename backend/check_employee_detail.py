from mongo_db import MongoDBManager
import json

db = MongoDBManager().db

# Get all documents without any filter
employees = list(db.employees.find({}))

print(f'Total documents in employees collection: {len(employees)}')
print('='*60)

for i, emp in enumerate(employees, 1):
    print(f'\n--- Employee {i} ---')
    # Convert ObjectId to string for JSON serialization
    emp_dict = {k: str(v) if k == '_id' else v for k, v in emp.items()}
    print(json.dumps(emp_dict, indent=2, default=str))
    
    # Check if has required fields
    print(f'\nHas employee_id: {"employee_id" in emp}')
    print(f'Has name: {"name" in emp}')
    print(f'Has is_active: {"is_active" in emp}')
    print(f'Has face_embedding: {"face_embedding" in emp}')

print('\n' + '='*60)
print(f'\nSummary:')
print(f'Total employees: {len(employees)}')
print(f'Active employees: {db.employees.count_documents({"is_active": True})}')
