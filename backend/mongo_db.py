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
        # Get employees yang is_active = True ATAU tidak punya field is_active (default active)
        employees = list(self.employees.find({
            '$or': [
                {'is_active': True},
                {'is_active': {'$exists': False}}  # Include employees tanpa field is_active
            ]
        }))
        
        for emp in employees:
            emp['_id'] = str(emp['_id'])
            if 'created_at' in emp and emp['created_at']:
                emp['created_at'] = emp['created_at'].isoformat()
            if 'last_updated' in emp and emp['last_updated']:
                emp['last_updated'] = emp['last_updated'].isoformat()
            # Set default is_active jika tidak ada
            if 'is_active' not in emp:
                emp['is_active'] = True
        return employees

    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in', allow_duplicate=True):
        """
        Record attendance dengan struktur baru (date, checkin, checkout, work_duration_minutes)
        
        Args:
            employee_id: ID karyawan
            confidence: Confidence score dari face recognition
            attendance_type: 'check_in' atau 'check_out'
            allow_duplicate: True = allow re-checkin (testing), False = prevent duplicate (production)
        """
        try:
            # Cek employee exists atau auto-create
            existing_employee = self.employees.find_one({'employee_id': employee_id})
            if not existing_employee:
                # Auto-create employee
                employee_data = {
                    'employee_id': employee_id,
                    'name': f"Employee {employee_id}",
                    'department': 'General', 
                    'is_active': True,
                    'created_at': datetime.now()
                }
                self.employees.insert_one(employee_data)
                print(f"✅ Auto-created employee: {employee_id}")
                existing_employee = employee_data
            
            now = datetime.now()
            today_str = now.strftime('%Y-%m-%d')
            
            # Cek apakah sudah ada record untuk hari ini
            existing_record = self.attendance.find_one({
                'employee_id': employee_id,
                'date': today_str
            })
            
            if attendance_type == 'check_in':
                # Hitung status check-in: early (< 7:00), ontime (7:00 - 9:00), late (> 9:00)
                early_time = now.replace(hour=7, minute=0, second=0, microsecond=0)
                work_start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
                
                if now < early_time:
                    status = 'early'  # Sebelum jam 7 pagi
                elif now <= work_start_time:
                    status = 'ontime'  # Antara 7:00 - 9:00
                else:
                    status = 'late'  # Setelah jam 9 pagi
                
                if existing_record:
                    # Cek apakah allow duplicate
                    if not allow_duplicate:
                        print(f"⚠️ Duplicate check-in prevented for {employee_id}. Already checked in today.")
                        return None
                    
                    # Update checkin jika sudah ada record (re-checkin for testing)
                    self.attendance.update_one(
                        {'employee_id': employee_id, 'date': today_str},
                        {
                            '$set': {
                                'checkin': {
                                    'status': status,
                                    'timestamp': now.isoformat()
                                },
                                'updatedAt': now
                            }
                        }
                    )
                    print(f"✅ CHECK-IN updated for {employee_id} ({status}) - Testing mode")
                else:
                    # Create record baru untuk hari ini
                    attendance_data = {
                        'date': today_str,
                        'employee_id': employee_id,
                        'employee_name': existing_employee.get('name', f"Employee {employee_id}"),
                        'checkin': {
                            'status': status,
                            'timestamp': now.isoformat()
                        },
                        'checkout': None,
                        'work_duration_minutes': 0,
                        'createdAt': now,
                        'updatedAt': now
                    }
                    result = self.attendance.insert_one(attendance_data)
                    print(f"✅ CHECK-IN recorded for {employee_id} ({status})")
                    return str(result.inserted_id)
                    
            elif attendance_type == 'check_out':
                if not existing_record:
                    print(f"⚠️ No check-in record found for {employee_id} today. Cannot check-out.")
                    return None
                
                if not existing_record.get('checkin'):
                    print(f"⚠️ No check-in data found for {employee_id}. Cannot check-out.")
                    return None
                
                # Parse checkin timestamp
                checkin_time_str = existing_record['checkin'].get('timestamp')
                if not checkin_time_str:
                    print(f"⚠️ Invalid check-in timestamp for {employee_id}")
                    return None
                
                # Parse ISO format timestamp
                if 'T' in checkin_time_str:
                    checkin_time = datetime.fromisoformat(checkin_time_str)
                else:
                    checkin_time = datetime.strptime(checkin_time_str, '%Y-%m-%d %H:%M:%S')
                
                # Hitung work duration dalam menit
                work_duration = int((now - checkin_time).total_seconds() / 60)
                
                # Hitung status check-out: early (< 8 jam), ontime (8-10 jam), late (> 10 jam)
                work_hours = work_duration / 60
                
                if work_hours < 8:
                    checkout_status = 'early'  # Kurang dari 8 jam kerja
                elif work_hours <= 10:
                    checkout_status = 'ontime'  # 8-10 jam (normal)
                else:
                    checkout_status = 'late'  # Lebih dari 10 jam (overtime)
                
                # Update dengan checkout dan duration
                self.attendance.update_one(
                    {'employee_id': employee_id, 'date': today_str},
                    {
                        '$set': {
                            'checkout': {
                                'status': checkout_status,
                                'timestamp': now.isoformat()
                            },
                            'work_duration_minutes': work_duration,
                            'updatedAt': now
                        }
                    }
                )
                print(f"✅ CHECK-OUT recorded for {employee_id} (worked {work_duration} minutes, status: {checkout_status})")
                return existing_record.get('_id')
            
            return True
            
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

            # Aggregate untuk pairing check-in dan check-out
            pipeline = [
                {
                    '$match': {
                        'timestamp': {'$gte': start_of_day, '$lte': end_of_day}
                    }
                },
                {
                    '$sort': {'timestamp': 1}  # Urutkan berdasarkan waktu
                },
                {
                    '$group': {
                        '_id': '$employee_id',
                        'records': {
                            '$push': {
                                'type': '$type',
                                'timestamp': '$timestamp',
                                'confidence': '$confidence'
                            }
                        }
                    }
                },
                {
                    '$lookup': {
                        'from': 'employees',
                        'localField': '_id',
                        'foreignField': 'employee_id',
                        'as': 'employee_info'
                    }
                },
                {
                    '$unwind': '$employee_info'
                },
                {
                    '$project': {
                        'employeeId': '$_id',
                        'name': '$employee_info.name',
                        'department': '$employee_info.department',
                        'records': 1,
                        'checkIn': {
                            '$arrayElemAt': [
                                {
                                    '$filter': {
                                        'input': '$records',
                                        'as': 'record',
                                        'cond': {'$eq': ['$$record.type', 'check_in']}
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
                                        'cond': {'$eq': ['$$record.type', 'check_out']}
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
                check_in_time = item['checkIn']['timestamp'] if item['checkIn'] else None
                check_out_time = item['checkOut']['timestamp'] if item['checkOut'] else None
                
                formatted_results.append({
                    '_id': str(item.get('_id', '')),
                    'employeeId': item['employeeId'],
                    'name': item['name'],
                    'department': item['department'],
                    'checkIn': check_in_time.isoformat() if check_in_time else None,
                    'checkOut': check_out_time.isoformat() if check_out_time else None,
                    'status': 'Present' if check_in_time else 'Absent',
                    'workingHours': self.calculate_working_hours(check_in_time, check_out_time)
                })
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting attendance with checkout: {e}")
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
            
            # Count unique employees yang check-in hari ini
            present_today = len(self.attendance.distinct('employee_id', {
                'timestamp': {'$gte': start_of_day}
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
    
    def get_daily_analytics(self, date=None):
        try:
            if date is None:
                date = datetime.now().strftime('%Y-%m-%d')
            
            # Simple analytics calculation
            stats = self.get_attendance_stats()
            
            analytics_data = {
                'date': date,
                'attendance_rate': stats.get('attendance_rate', 0),
                'total_employees': stats.get('total_employees', 0),
                'present_today': stats.get('present_today', 0),
                'avg_confidence': 95.2,  # Placeholder
                'peak_hour': '08:30'     # Placeholder
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
    
    def get_attendance_with_employee_data(self, date_str=None): 
        """Get attendance data dengan employee information untuk frontend"""
        try:
            if date_str:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
            else:
                # Default to today
                start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

            pipeline = [
                {
                    '$match': {
                        'timestamp': {'$gte': start_of_day, '$lte': end_of_day},
                        'status': 'present'
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
                    '$unwind': {
                        'path': '$employee_info',
                        'preserveNullAndEmptyArrays': True  # Tetap include meski employee tidak ditemukan
                    }
                },
                {
                    '$project': {
                        '_id': 1,
                        'employeeId': '$employee_id',
                        'name': '$employee_info.name',  # Ambil nama dari collection employees
                        'department': '$employee_info.department',
                        'timestamp': 1,
                        'confidence': 1,
                        'status': 1,
                        'checkIn': '$timestamp',  # Untuk compatibility dengan frontend
                        'employeeName': '$employee_info.name'  # Dual field support
                    }
                },
                {
                    '$sort': {'timestamp': -1}  # Terbaru di atas
                }
            ]
            
            results = list(self.attendance.aggregate(pipeline))
            
            # ✅ Convert ObjectId dan datetime untuk JSON response
            for item in results:
                item['_id'] = str(item['_id'])
                if 'timestamp' in item:
                    item['timestamp'] = item['timestamp'].isoformat()
                if 'checkIn' in item:
                    item['checkIn'] = item['checkIn'].isoformat()
                    
            return results
            
        except Exception as e:
            print(f"❌ Error getting attendance data: {e}")
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
        
# Global instance
db = MongoDBManager()