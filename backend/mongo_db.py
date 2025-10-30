from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import traceback
import uuid

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
        print("✅ MongoDB Manager initialized")
    
    def _create_indexes(self):
        """Create necessary indexes"""
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        self.attendance.create_index('employees')
        print("✅ Database indexes created")

    # ==================== EMPLOYEE MANAGEMENT ====================
    
    def get_next_employee_id(self):
        """Generate auto-increment employee ID (EMP-001, EMP-002, etc.)"""
        try:
            last_employee = self.employees.find_one(
                {'employee_id': {'$regex': '^EMP-'}}, 
                sort=[("employee_id", -1)]
            )
            
            if last_employee and last_employee.get('employee_id'):
                last_id = last_employee['employee_id']
                try:
                    last_number = int(last_id.split('-')[1])
                    next_number = last_number + 1
                except:
                    next_number = 1
            else:
                next_number = 1
            
            return f"EMP-{next_number:03d}"
            
        except Exception as e:
            print(f"❌ Error generating employee ID: {e}")
            return f"EMP-{int(datetime.now().timestamp())}"
    
    def register_employee_face(self, name, face_embedding, department='General'):
        """Register new employee dengan face embedding dan auto-generated ID"""
        try:
            employee_id = self.get_next_employee_id()
            
            employee_data = {
                'employee_id': employee_id,
                'name': name,
                'department': department,
                'face_embeddings': face_embedding,
                'is_active': True,
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            }
            
            result = self.employees.insert_one(employee_data)
            
            if result.inserted_id:
                print(f"✅ New employee registered: {employee_id} - {name}")
                return {
                    'success': True,
                    'message': 'Employee registered successfully',
                    'employee_id': employee_id
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to insert employee'
                }
            
        except Exception as e:
            print(f"❌ Error registering employee: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def get_all_employees(self):
        """Get all active employees"""
        try:
            employees = list(self.employees.find({'is_active': True}))
            for emp in employees:
                emp['_id'] = str(emp['_id'])
                if 'created_at' in emp and emp['created_at']:
                    emp['created_at'] = emp['created_at'].isoformat()
                if 'last_updated' in emp and emp['last_updated']:
                    emp['last_updated'] = emp['last_updated'].isoformat()
            return employees
        except Exception as e:
            print(f"❌ Error getting employees: {e}")
            return []
    
    def get_employee_by_id(self, employee_id):
        """Get employee data by ID"""
        try:
            employee = self.employees.find_one({'employee_id': employee_id})
            if employee:
                return {
                    'success': True,
                    'employee': {
                        'employee_id': employee['employee_id'],
                        'name': employee['name'],
                        'department': employee.get('department', 'General'),
                        'created_at': employee['created_at'].isoformat() if 'created_at' in employee else None
                    }
                }
            else:
                return {'success': False, 'message': 'Employee not found'}
        except Exception as e:
            print(f"❌ Error getting employee: {e}")
            return {'success': False, 'error': str(e)}

    # ==================== FACE RECOGNITION ====================
    
    def recognize_face(self, face_embedding, threshold=0.6):
        """Recognize face from embedding dengan similarity threshold"""
        try:
            employees = list(self.employees.find({'is_active': True}))
            
            best_match = None
            highest_similarity = 0
            
            for employee in employees:
                if 'face_embeddings' in employee and employee['face_embeddings']:
                    similarity = self.calculate_similarity(face_embedding, employee['face_embeddings'])
                    
                    if similarity > highest_similarity and similarity >= threshold:
                        highest_similarity = similarity
                        best_match = employee
            
            if best_match:
                return {
                    'success': True,
                    'employee': {
                        'employee_id': best_match['employee_id'],
                        'name': best_match['name'],
                        'department': best_match.get('department', 'General'),
                        'similarity': highest_similarity
                    },
                    'message': 'Face recognized successfully'
                }
            else:
                return {
                    'success': False,
                    'message': 'No matching employee found',
                    'similarity': highest_similarity
                }
                
        except Exception as e:
            print(f"❌ Error recognizing face: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def calculate_similarity(self, embedding1, embedding2):
        """Calculate cosine similarity between two embeddings"""
        try:
            dot_product = sum(a * b for a, b in zip(embedding1, embedding2))
            norm1 = sum(a * a for a in embedding1) ** 0.5
            norm2 = sum(b * b for b in embedding2) ** 0.5
            
            if norm1 == 0 or norm2 == 0:
                return 0
                
            return dot_product / (norm1 * norm2)
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            return 0

    # ==================== ATTENDANCE RECORDING ====================
    
    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in'):
        """
        Record attendance dengan type (check_in/check_out)
        Compatible dengan struktur AttendanceLog yang menggunakan field 'employees' untuk nama
        """
        try:
            # Cari employee berdasarkan employee_id
            existing_employee = self.employees.find_one({'employee_id': employee_id})
            
            if not existing_employee:
                print(f"❌ Employee with ID {employee_id} not found")
                return None
            
            # Generate unique ID untuk attendance record
            attendance_id = str(uuid.uuid4())[:8]
            
            # Format yang compatible dengan AttendanceLog
            # Menggunakan 'check-in' / 'check-out' dengan dash (bukan underscore)
            status = 'check-in' if attendance_type == 'check_in' else 'check-out'
            
            attendance_data = {
                'employee_id': employee_id,
                'employees': existing_employee['name'],  # Field 'employees' berisi nama
                'status': status,  # 'check-in' atau 'check-out'
                'action': attendance_type,  # 'check_in' atau 'check_out'
                'timestamp': datetime.now(),
                'confidence': float(confidence)
            }
            
            result = self.attendance.insert_one(attendance_data)
            print(f"✅ {status.upper()} recorded for {employee_id} ({existing_employee['name']})")
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"❌ Error recording {attendance_type}: {e}")
            traceback.print_exc()
            return None

    # ==================== ATTENDANCE QUERIES ====================
    
    def get_attendance_with_checkout(self, date_str=None):
        """
        Get attendance data dengan pairing check-in/check-out
        Compatible dengan AttendanceLog frontend
        """
        try:
            if date_str:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
            else:
                start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

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
                        '_id': '$employees',  # Group by nama karyawan
                        'employee_id': {'$first': '$employee_id'},
                        'records': {
                            '$push': {
                                'id': '$id',
                                'status': '$status',
                                'timestamp': '$timestamp',
                                'confidence': '$confidence'
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
                        'name': '$_id',
                        'department': {
                            '$ifNull': [
                                {'$arrayElemAt': ['$employee_info.department', 0]},
                                'General'
                            ]
                        },
                        'checkIn': {
                            '$arrayElemAt': [
                                {
                                    '$map': {
                                        'input': {
                                            '$filter': {
                                                'input': '$records',
                                                'as': 'record',
                                                'cond': {'$eq': ['$$record.status', 'check-in']}
                                            }
                                        },
                                        'as': 'filtered',
                                        'in': '$$filtered.timestamp'
                                    }
                                },
                                0
                            ]
                        },
                        'checkOut': {
                            '$arrayElemAt': [
                                {
                                    '$map': {
                                        'input': {
                                            '$filter': {
                                                'input': '$records',
                                                'as': 'record',
                                                'cond': {'$eq': ['$$record.status', 'check-out']}
                                            }
                                        },
                                        'as': 'filtered',
                                        'in': '$$filtered.timestamp'
                                    }
                                },
                                0
                            ]
                        },
                        'confidence': {'$arrayElemAt': ['$records.confidence', 0]}
                    }
                }
            ]
            
            results = list(self.attendance.aggregate(pipeline))
            
            # Format untuk frontend
            formatted_results = []
            for item in results:
                check_in = item.get('checkIn')
                check_out = item.get('checkOut')
                
                formatted_item = {
                    '_id': str(item.get('_id', '')),
                    'employeeId': item.get('employeeId', 'N/A'),
                    'name': item.get('name', 'Unknown'),
                    'department': item.get('department', 'General'),
                    'checkIn': check_in.isoformat() if check_in else None,
                    'checkOut': check_out.isoformat() if check_out else None,
                    'confidence': item.get('confidence', 0),
                    'status': 'Present' if check_in else 'Absent',
                    'workingHours': self.calculate_working_hours(check_in, check_out)
                }
                
                formatted_results.append(formatted_item)
            
            print(f"✅ Found {len(formatted_results)} attendance records for {date_str or 'today'}")
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting attendance with checkout: {e}")
            traceback.print_exc()
            return []
    
    def get_attendance_by_date(self, date_str=None):
        """Get raw attendance records by date - supports 'all' filter"""
        try:
            # Handle 'all' filter - get all records without date filtering
            if date_str == 'all':
                query = {}
                print("📅 Fetching ALL attendance records (no date filter)")
            elif date_str:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
                print(f"📅 Fetching attendance records for date: {date_str}")
            else:
                # Default to today
                date_obj = datetime.now()
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
                print(f"📅 Fetching attendance records for today")
            
            results = list(self.attendance.find(query).sort('timestamp', -1))
            
            # Format untuk frontend
            formatted_results = []
            for r in results:
                formatted_record = {
                    '_id': str(r.get('_id')),
                    'employeeId': r.get('employee_id', 'N/A'),
                    'name': r.get('employees', 'Unknown'),
                    'employees': r.get('employees', 'Unknown'),
                    'action': r.get('action', r.get('status', 'check-in')),
                    'status': r.get('status', 'check-in'),
                    'timestamp': r.get('timestamp').isoformat() if r.get('timestamp') else None,
                    'confidence': float(r.get('confidence', 0))
                }
                
                formatted_results.append(formatted_record)
            
            print(f"✅ Formatted {len(formatted_results)} attendance records")
            return formatted_results

        except Exception as e:
            print(f"❌ Error getting attendance by date: {e}")
            traceback.print_exc()
            return []
    
    def calculate_working_hours(self, check_in, check_out):
        """Calculate working hours between check-in and check-out"""
        if not check_in:
            return "0h 0m"
        
        try:
            if isinstance(check_in, str):
                check_in = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
            
            if not check_out:
                check_out = datetime.now()
            elif isinstance(check_out, str):
                check_out = datetime.fromisoformat(check_out.replace('Z', '+00:00'))
            
            diff_seconds = (check_out - check_in).total_seconds()
            hours = int(diff_seconds // 3600)
            minutes = int((diff_seconds % 3600) // 60)
            
            return f"{hours}h {minutes}m"
        except Exception as e:
            print(f"❌ Error calculating working hours: {e}")
            return "0h 0m"

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

    # ==================== STATISTICS & ANALYTICS ====================
    
    def get_attendance_stats(self):
        """Get attendance statistics for today"""
        try:
            start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            total_employees = self.employees.count_documents({'is_active': True})
            
            # Count unique employees yang check-in hari ini
            present_today = len(self.attendance.distinct('employee_id', {
                'timestamp': {'$gte': start_of_day},
                'status': 'check-in'
            }))
            
            attendance_rate = (present_today / total_employees * 100) if total_employees > 0 else 0
            
            return {
                'total_employees': total_employees,
                'present_today': present_today,
                'attendance_rate': round(attendance_rate, 2)
            }
            
        except Exception as e:
            print(f"❌ Error getting attendance stats: {e}")
            return {
                'total_employees': 0,
                'present_today': 0,
                'attendance_rate': 0
            }
    
    def get_daily_analytics(self, date=None):
        """Get daily analytics data"""
        try:
            if date is None:
                date = datetime.now().strftime('%Y-%m-%d')
            
            stats = self.get_attendance_stats()
            
            return {
                'date': date,
                'attendance_rate': stats.get('attendance_rate', 0),
                'total_employees': stats.get('total_employees', 0),
                'present_today': stats.get('present_today', 0),
                'avg_confidence': 95.2,
                'peak_hour': '08:30'
            }
            
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
                if 'timestamp' in item and item['timestamp']:
                    item['timestamp'] = item['timestamp'].strftime('%H:%M:%S')
            
            return results
        except Exception as e:
            print(f"❌ Error getting recent recognitions: {e}")
            return []

# Global instance
db = MongoDBManager()