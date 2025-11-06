from mongo_db import MongoDBManager

db = MongoDBManager().db

# Update all employees to be active
result = db.employees.update_many(
    {},  # empty filter = all documents
    {'$set': {'is_active': True}}
)

print(f'Updated {result.modified_count} employees to is_active=True')

# Verify
active_count = db.employees.count_documents({'is_active': True})
total_count = db.employees.count_documents({})

print(f'Total employees: {total_count}')
print(f'Active employees: {active_count}')
print(f'\nAll employees are now active!')
