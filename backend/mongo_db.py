from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json
import traceback

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
            self.attendance.create_index('id')
            self.attendance.create_index('timestamp')
            self.attendance.create_index([('timestamp', -1)])
            # ✅ Index untuk employees field (nama karyawan)
            self.attendance.create_index('employees')
        
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

        def record_attendance(self, employee_id, confidence=0.0, attendance_type='check-in'):
            """Record attendance dengan type (check-in/check-out)"""
            try:
                # ✅ Cari employee berdasarkan employee_id
                existing_employee = self.employees.find_one({'employee_id': employee_id})
                
                if not existing_employee:
                    print(f"❌ Employee with ID {employee_id} not found. Attendance not recorded.")
                    return None

                
                # Generate unique ID untuk attendance record
                import uuid
                attendance_id = str(uuid.uuid4())[:8]
                
                # ✅ SIMPAN SESUAI STRUKTUR DATABASE YANG ADA
                attendance_data = {
                    'id': attendance_id,
                    'employees': existing_employee['name'],
                    'status': attendance_type,
                    'timestamp': datetime.now(),
                    'employee_id': employee_id,
                    'confidence': float(confidence)
                }

                
                result = self.attendance.insert_one(attendance_data)
                print(f"✅ {attendance_type.upper()} recorded for {employee_id} with ID: {attendance_id}")
                return str(result.inserted_id)
                
            except Exception as e:
                print(f"❌ Error recording {attendance_type}: {e}")
                traceback.print_exc()
                return None

        def get_attendance_with_checkout(self, date_str=None):
            """Get attendance data dengan pairing check-in/check-out"""
            try:
                if date_str:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                else:
                    start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                    end_of_day = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

                # ✅ FIXED: Aggregate berdasarkan struktur database yang benar
                pipeline = [
                    {
                        '$match': {
                            'timestamp': {'$gte': start_of_day, '$lte': end_of_day}
                        }
                    },
                    {
                        '$sort': {'timestamp': 1}
                    },
                    {
                        '$group': {
                            '_id': '$employees',  # ✅ Group by nama karyawan
                            'employee_id': {'$first': '$employee_id'},  # Ambil employee_id
                            'records': {
                                '$push': {
                                    'id': '$id',
                                    'status': '$status',
                                    'timestamp': '$timestamp',
                                    'employees': '$employees'
                                }
                            }
                        }
                    },
                    {
                        '$lookup': {
                            'from': 'employees',
                            'localField': 'employee_id',
                            'foreignField': 'employee_id',
                            'as': 'employee_info'
                        }
                    },
                    {
                        '$project': {
                            'employeeId': '$employee_id',
                            'name': '$_id',  # Nama dari group
                            'department': {
                                '$ifNull': [
                                    {'$arrayElemAt': ['$employee_info.department', 0]},
                                    'General'
                                ]
                            },
                            'records': 1,
                            'checkIn': {
                                '$arrayElemAt': [
                                    {
                                        '$filter': {
                                            'input': '$records',
                                            'as': 'record',
                                            'cond': {'$eq': ['$$record.status', 'check-in']}
                                        }
                                    },
                                    0
                                ]
                            },
                            'checkOut': {
                                '$arrayElemAt': [
                                    {
                                        '$filter': {
                                            'input': '$records',
                                            'as': 'record', 
                                            'cond': {'$eq': ['$$record.status', 'check-out']}
                                        }
                                    },
                                    0
                                ]
                            }
                        }
                    }
                ]
                
                results = list(self.attendance.aggregate(pipeline))
                
                # Format untuk frontend
                formatted_results = []
                for item in results:
                    check_in_time = item.get('checkIn', {}).get('timestamp') if item.get('checkIn') else None
                    check_out_time = item.get('checkOut', {}).get('timestamp') if item.get('checkOut') else None
                    
                    formatted_results.append({
                        '_id': str(item.get('_id', '')),
                        'employeeId': item.get('employeeId', 'N/A'),
                        'name': item.get('name'),
                        'department': item.get('department', 'General'),
                        'checkIn': check_in_time.isoformat() if check_in_time else None,
                        'checkOut': check_out_time.isoformat() if check_out_time else None,
                        'status': 'Present' if check_in_time else 'Absent',
                        'workingHours': self.calculate_working_hours(check_in_time, check_out_time)
                    })
                
                return formatted_results
                
            except Exception as e:
                print(f"❌ Error getting attendance with checkout: {e}")
                traceback.print_exc()
                return []

        def calculate_working_hours(self, check_in, check_out):
            """Calculate working hours antara check-in dan check-out"""
            if not check_in:
                return "0h"
            
            if not check_out:
                # Masih bekerja, hitung sampai sekarang
                check_out = datetime.now()
            
            diff_seconds = (check_out - check_in).total_seconds()
            hours = int(diff_seconds // 3600)
            minutes = int((diff_seconds % 3600) // 60)
            
            return f"{hours}h {minutes}m"
                
        def get_attendance_stats(self):
            try:
                start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                
                total_employees = self.employees.count_documents({'is_active': True})
                
                # ✅ Count unique employees yang check-in hari ini
                present_today = len(self.attendance.distinct('employees', {
                    'timestamp': {'$gte': start_of_day},
                    'status': 'check-in'
                }))
                
                attendance_rate = (present_today / total_employees * 100) if total_employees > 0 else 0
                
                return {
                    'total_employees': total_employees,
                    'present_today': present_today,
                    'attendance_rate': attendance_rate
                }
                
            except Exception as e:
                print(f"❌ Error getting attendance stats: {e}")
                return {
                    'total_employees': 0,
                    'present_today': 0, 
                    'attendance_rate': 0
                }
        
        def get_daily_analytics(self, date=None):
            try:
                if date is None:
                    date = datetime.now().strftime('%Y-%m-%d')
                
                stats = self.get_attendance_stats()
                
                analytics_data = {
                    'date': date,
                    'attendance_rate': stats.get('attendance_rate', 0),
                    'total_employees': stats.get('total_employees', 0),
                    'present_today': stats.get('present_today', 0),
                    'avg_confidence': 95.2,
                    'peak_hour': '08:30'
                }
                
                print(f"📊 Analytics generated for {date}")
                return analytics_data
                
            except Exception as e:
                print(f"❌ Error in get_daily_analytics: {e}")
                return {
                    'date': date,
                    'attendance_rate': 0,
                    'total_employees': 0,
                    'present_today': 0,
                    'avg_confidence': 0,
                    'peak_hour': 'N/A'
                }
        
        def get_attendance_by_date(self, date_str=None):
            """Get raw attendance records by date - SIMPLIFIED VERSION"""
            try:
                if date_str:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                else:
                    date_obj = datetime.now()
                
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                
                # 🔧 SIMPLIFIED: Langsung ambil data tanpa lookup
                # Karena field 'employees' sudah ada di collection attendance
                query = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
                
                results = list(self.attendance.find(query).sort('timestamp', 1))
                
                # Format untuk frontend
                formatted_results = []
                for r in results:
                    formatted_results.append({
                        '_id': str(r.get('_id')),
                        'id': r.get('id', '-'),
                        'employeeId': r.get('employee_id', '-'),
                        'name': r.get('employees', '-'),  # ✅ Langsung ambil dari field 'employees'
                        'employees': r.get('employees', '-'),  # ✅ Backward compatibility
                        'status': r.get('status', '-'),
                        'timestamp': r.get('timestamp').isoformat() if r.get('timestamp') else None,
                        'confidence': float(r.get('confidence', 0))
                    })
                
                print(f"✅ Fetched {len(formatted_results)} attendance records for {date_str or 'today'}")
                return formatted_results

            except Exception as e:
                print(f"❌ Error getting attendance by date: {e}")
                traceback.print_exc()
                return []
        
        def get_attendance_by_employee_id(self, employee_id, date_str=None):
            """Get attendance data untuk employee tertentu"""
            try:
                query = {'employee_id': employee_id}
                
                if date_str:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query['timestamp'] = {'$gte': start_of_day, '$lte': end_of_day}
                
                attendance_records = list(self.attendance.find(query).sort('timestamp', -1))
                
                # Convert untuk JSON
                for record in attendance_records:
                    record['_id'] = str(record['_id'])
                    if 'timestamp' in record:
                        record['timestamp'] = record['timestamp'].isoformat()
                        
                return attendance_records
                
            except Exception as e:
                print(f"❌ Error getting employee attendance: {e}")
                return []

        def get_recent_recognitions(self, limit=10):
            """Get recent attendance records"""
            try:
                pipeline = [
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
                        '$project': {
                            'id': 1,
                            'employees': 1,
                            'status': 1,
                            'timestamp': 1,
                            'confidence': 1,
                            'employeeId': '$employee_id',
                            'department': {
                                '$ifNull': [
                                    {'$arrayElemAt': ['$employee.department', 0]},
                                    'General'
                                ]
                            }
                        }
                    }
                ]
                
                results = list(self.attendance.aggregate(pipeline))
                
                for item in results:
                    item['_id'] = str(item['_id'])
                    if 'timestamp' in item:
                        item['timestamp'] = item['timestamp'].isoformat()
                        
                return results
                
            except Exception as e:
                print(f"❌ Error getting recent recognitions: {e}")
                return []

    # Global instance
db = MongoDBManager()