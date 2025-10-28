from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json

load_dotenv()

class MongoDBManager:
    def __init__(self):
        self.client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
        self.db = self.client[os.getenv('DATABASE_NAME', 'attendance_system')]
        
        self.employees = self.db.employees
        self.attendance = self.db.attendance
        self.analytics = self.db.analytics
        self.system_logs = self.db.system_logs
        
        self._create_indexes()
    
    def _create_indexes(self):
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
    
    def register_employee(self, employee_id, name, department='General'):
        employee_data = {
            'employee_id': employee_id,
            'name': name,
            'department': department,
            'face_embeddings': [],
            'is_active': True,
            'created_at': datetime.now(),
            'last_updated': datetime.now()
        }
        
        try:
            result = self.employees.insert_one(employee_data)
            return {'success': True, 'message': 'Employee registered successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_all_employees(self):
        employees = list(self.employees.find({'is_active': True}))
        for emp in employees:
            emp['_id'] = str(emp['_id'])
            emp['created_at'] = emp['created_at'].isoformat()
            emp['last_updated'] = emp['last_updated'].isoformat()
        return employees
    
    def record_attendance(self, employee_id, confidence=0.0, status='present'):
        attendance_data = {
            'employee_id': employee_id,
            'timestamp': datetime.now(),
            'confidence': float(confidence),
            'status': status,
            'synced': False
        }
        
        result = self.attendance.insert_one(attendance_data)
        return str(result.inserted_id)
    
    def get_attendance_stats(self):
        start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        total_employees = self.employees.count_documents({'is_active': True})
        present_today = len(self.attendance.distinct('employee_id', {
            'timestamp': {'$gte': start_of_day},
            'status': 'present'
        }))
        
        return {
            'total_employees': total_employees,
            'present_today': present_today,
            'attendance_rate': (present_today / total_employees * 100) if total_employees > 0 else 0
        }
    
    def get_recent_recognitions(self, limit=10):
        start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        pipeline = [
            {
                '$match': {
                    'timestamp': {'$gte': start_of_day},
                    'status': 'present'
                }
            },
            {
                '$sort': {'timestamp': -1}
            },
            {
                '$limit': limit
            },
            {
                '$lookup': {
                    'from': 'employees',
                    'localField': 'employee_id',
                    'foreignField': 'employee_id',
                    'as': 'employee'
                }
            },
            {
                '$unwind': '$employee'
            },
            {
                '$project': {
                    'name': '$employee.name',
                    'timestamp': 1,
                    'confidence': 1
                }
            }
        ]
        
        results = list(self.attendance.aggregate(pipeline))
        for item in results:
            item['timestamp'] = item['timestamp'].strftime('%H:%M:%S')
        
        return results
    
    def get_daily_analytics(self):
        today = datetime.now().strftime('%Y-%m-%d')
        stats = self.get_attendance_stats()
        
        return {
            'attendance_rate': round(stats['attendance_rate'], 1),
            'total_employees': stats['total_employees'],
            'present_today': stats['present_today'],
            'avg_confidence': 95.2,  # Placeholder - bisa dihitung dari data real
            'peak_hour': '08:30'
        }
    
    def get_attendance_by_date(self, date_str=None):
        try:
            if date_str:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            else:
                date_obj = datetime.now()
            
            start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        except:
            start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        pipeline = [
            {
                '$match': {
                    'timestamp': {'$gte': start_of_day, '$lte': end_of_day}
                }
            },
            {
                '$lookup': {
                    'from': 'employees',
                    'localField': 'employee_id',
                    'foreignField': 'employee_id',
                    'as': 'employee'
                }
            },
            {
                '$unwind': '$employee'
            },
            {
                '$project': {
                    'employeeId': '$employee_id',
                    'name': '$employee.name',
                    'department': '$employee.department',
                    'timestamp': 1,
                    'confidence': 1,
                    'status': 1
                }
            },
            {
                '$sort': {'timestamp': -1}
            }
        ]
        
        results = list(self.attendance.aggregate(pipeline))
        for item in results:
            item['timestamp'] = item['timestamp'].isoformat()
        
        return results

# Global instance
db = MongoDBManager()