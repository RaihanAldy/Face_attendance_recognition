from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json
import traceback
import bcrypt


load_dotenv()

class MongoDBManager:
    def __init__(self):
        self.client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
        self.db = self.client[os.getenv('DATABASE_NAME', 'attendance_system')]
        self.db = self.client["faceRecognition"]
        
        self.admins = self.db.admins
        self.employees = self.db.employees
        self.attendance = self.db.attendance
        self.analytics = self.db.analytics
        self.system_logs = self.db.system_logs
        self.login_logs = self.db["login_logs"]
        
        self._create_indexes()
    
    def _create_indexes(self):
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        
    # ⚙️ REGISTER ADMIN
    def register_admin(self, username, password):
        existing = self.admins.find_one({"username": username})
        if existing:
            return {"status": "error", "message": "Admin sudah ada"}

        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        self.admins.insert_one({"username": username, "password": hashed_pw})
        return {"status": "success", "message": "Admin berhasil didaftarkan"}

    # ⚙️ LOGIN ADMIN
    def login_admin(self, username, password):
        admin = self.admins.find_one({"username": username})
        if not admin:
            return {"status": "error", "message": "Admin tidak ditemukan"}

        if bcrypt.checkpw(password.encode("utf-8"), admin["password"]):
            return {"status": "success", "message": "Login berhasil"}
        else:
            return {"status": "error", "message": "Password salah"}
        
    
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

    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in'):
        """Record attendance dengan type (check_in/check_out)"""
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
            
            attendance_data = {
                'employee_id': employee_id,
                'timestamp': datetime.now(),
                'confidence': float(confidence),
                'type': attendance_type
            }
            
            result = self.attendance.insert_one(attendance_data)
            print(f"✅ {attendance_type.upper()} recorded for {employee_id}")
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
        
    def register_employee_face(self, name, face_embedding, department='General'):
        """Register employee dengan face embedding dan auto ID - REAL IMPLEMENTATION"""
        try:
            # Generate employee ID
            employee_id = self.get_next_employee_id()
            
            employee_data = {
                'employee_id': employee_id,
                'name': name,
                'department': department,
                'face_embeddings': face_embedding,  # ✅ SIMPAN FACE EMBEDDING REAL
                'is_active': True,
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            }
            
            result = self.employees.insert_one(employee_data)
            print(f"✅ REAL: Employee {name} registered with ID: {employee_id}")
            
            return {
                'success': True, 
                'message': 'Employee registered successfully',
                'employee_id': employee_id,
                'name': name,
                'department': department
            }
            
        except Exception as e:
            print(f"❌ Error registering employee: {e}")
            return {'success': False, 'error': str(e)}
        
    def recognize_face(self, face_embedding, threshold=0.6):
        """Recognize face dari embedding - REAL IMPLEMENTATION"""
        try:
            print(f"🔍 REAL: Searching for face match in database...")
            
            # Dapatkan semua employees yang aktif
            employees = list(self.employees.find({'is_active': True}))
            print(f"📊 REAL: Checking against {len(employees)} employees")
            
            if not employees:
                print("❌ REAL: No employees found in database")
                return {
                    'success': False,
                    'message': 'No employees registered in system',
                    'similarity': 0
                }
            
            best_match = None
            highest_similarity = 0
            
            # ✅ REAL FACE MATCHING LOGIC
            for employee in employees:
                stored_embedding = employee.get('face_embeddings', [])
                
                if stored_embedding and len(stored_embedding) == len(face_embedding):
                    # Hitung similarity (cosine similarity sederhana)
                    similarity = self.calculate_similarity(face_embedding, stored_embedding)
                    print(f"👤 {employee['name']} - Similarity: {similarity:.3f}")
                    
                    if similarity > highest_similarity and similarity >= threshold:
                        highest_similarity = similarity
                        best_match = employee
            
            if best_match:
                print(f"✅ REAL: Match found - {best_match['name']} (Similarity: {highest_similarity:.3f})")
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
                print(f"❌ REAL: No match found (best similarity: {highest_similarity:.3f})")
                return {
                    'success': False,
                    'message': 'No matching employee found',
                    'similarity': highest_similarity
                }
                
        except Exception as e:
            print(f"❌ REAL: Error recognizing face: {e}")
            return {'success': False, 'error': str(e)}
    
    def calculate_similarity(self, embedding1, embedding2):
        """Calculate cosine similarity antara dua embeddings - REAL IMPLEMENTATION"""
        try:
            if len(embedding1) != len(embedding2):
                return 0
                
            # Cosine similarity calculation
            dot_product = sum(a * b for a, b in zip(embedding1, embedding2))
            norm1 = sum(a * a for a in embedding1) ** 0.5
            norm2 = sum(b * b for b in embedding2) ** 0.5
            
            if norm1 == 0 or norm2 == 0:
                return 0
                
            similarity = dot_product / (norm1 * norm2)
            return max(0, min(1, similarity))  # Clamp between 0 and 1
            
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            return 0
        
# Global instance   
db = MongoDBManager()