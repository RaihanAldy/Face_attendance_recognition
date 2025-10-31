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
        
        self._create_indexes()
        print("✅ MongoDB Manager initialized")
    
    def _create_indexes(self):
        """Create necessary indexes untuk struktur baru"""
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        self.attendance.create_index('date')
        self.attendance.create_index([('employee_id', 1), ('date', 1)])
        print("✅ Database indexes created")

    # ==================== EMPLOYEE MANAGEMENT ====================
    
    def get_next_employee_id(self):
        """Generate auto-increment employee ID"""
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
    
    def register_employee_face(self, name, face_embedding, department='General', position='', email='', phone=''):
        """Register new employee dengan face embedding"""
        try:
            employee_id = self.get_next_employee_id()
            
            employee_data = {
                'employee_id': employee_id,
                'name': name,
                'department': department,
                'position': position,
                'email': email,
                'phone': phone,
                'face_embeddings': face_embedding,
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            }
            
            result = self.employees.insert_one(employee_data)
            
            if result.inserted_id:
                print(f"✅ New employee registered: {employee_id} - {name}")
                return {
                    'success': True,
                    'message': 'Employee registered successfully',
                    'employee_id': employee_id,
                    'employee_data': {
                        'employee_id': employee_id,
                        'name': name,
                        'department': department,
                        'position': position,
                        'email': email,
                        'phone': phone
                    }
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
        """Get all employees"""
        try:
            employees = list(self.employees.find())
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

    # ==================== FACE RECOGNITION ====================

    def recognize_face(self, face_embedding, threshold=0.6):
        """Recognize face from embedding dengan similarity threshold"""
        try:
            print(f"🔍 Starting face recognition...")
            print(f"   Face embedding length: {len(face_embedding)}")
            
            # Ambil semua employee
            employees = list(self.employees.find({}))
            print(f"   Total employees in database: {len(employees)}")
            
            best_match = None
            highest_similarity = 0
            
            for employee in employees:
                if 'face_embeddings' in employee and employee['face_embeddings']:
                    similarity = self.calculate_similarity(face_embedding, employee['face_embeddings'])
                    
                    if similarity > highest_similarity and similarity >= threshold:
                        highest_similarity = similarity
                        best_match = employee
            
            if best_match:
                print(f"✅ Face recognized: {best_match['name']} ({best_match['employee_id']})")
                return {
                    'success': True,
                    'employee': {
                        'employee_id': best_match['employee_id'],
                        'name': best_match['name'],
                        'department': best_match.get('department', 'General'),
                        'position': best_match.get('position', ''),
                        'email': best_match.get('email', ''),
                        'phone': best_match.get('phone', ''),
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
            if len(embedding1) != len(embedding2):
                min_length = min(len(embedding1), len(embedding2))
                embedding1 = embedding1[:min_length]
                embedding2 = embedding2[:min_length]
            
            dot_product = sum(a * b for a, b in zip(embedding1, embedding2))
            norm1 = sum(a * a for a in embedding1) ** 0.5
            norm2 = sum(b * b for b in embedding2) ** 0.5
            
            if norm1 == 0 or norm2 == 0:
                return 0
                
            return dot_product / (norm1 * norm2)
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            return 0

    # ==================== ATTENDANCE LOGGING ====================
    
    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in'):
        """Record attendance dengan struktur baru"""
        try:
            print(f"🎯 Recording {attendance_type} for {employee_id}")
            
            # Cari employee
            existing_employee = self.employees.find_one({'employee_id': employee_id})
            
            if not existing_employee:
                print(f"❌ Employee {employee_id} not found")
                return None
            
            current_time = datetime.now()
            date_str = current_time.strftime('%Y-%m-%d')
            day_of_week = current_time.strftime('%A')
            
            # Tentukan status
            status, lateness_minutes = self._calculate_attendance_status(current_time, attendance_type)
            
            # Cek existing log
            existing_log = self.attendance.find_one({
                'employee_id': employee_id,
                'date': date_str
            })
            
            if existing_log:
                # Update existing
                update_data = {}
                
                if attendance_type == 'check_in':
                    update_data['check_in_time'] = current_time
                    update_data['check_in_status'] = status
                    update_data['check_in_confidence'] = confidence
                else:
                    update_data['check_out_time'] = current_time
                    update_data['check_out_status'] = status
                    update_data['check_out_confidence'] = confidence
                    
                    if existing_log.get('check_in_time'):
                        work_duration = self._calculate_work_duration(
                            existing_log['check_in_time'], 
                            current_time
                        )
                        update_data['work_duration'] = work_duration
                
                update_data['last_updated'] = current_time
                update_data['lateness_minutes'] = lateness_minutes
                
                result = self.attendance.update_one(
                    {'_id': existing_log['_id']},
                    {'$set': update_data}
                )
                print(f"✅ Updated {attendance_type} for {employee_id}")
                
            else:
                # Buat baru
                attendance_data = {
                    'employee_id': employee_id,
                    'employees': existing_employee['name'],
                    'department': existing_employee.get('department', 'General'),
                    'date': date_str,
                    'day_of_week': day_of_week,
                    'timestamp': current_time,
                    'last_updated': current_time,
                    'lateness_minutes': lateness_minutes,
                    'confidence': confidence
                }
                
                if attendance_type == 'check_in':
                    attendance_data.update({
                        'check_in_time': current_time,
                        'check_in_status': status,
                        'check_in_confidence': confidence,
                        'status': status
                    })
                else:
                    attendance_data.update({
                        'check_out_time': current_time,
                        'check_out_status': status,
                        'check_out_confidence': confidence,
                        'status': status
                    })
                
                result = self.attendance.insert_one(attendance_data)
                print(f"✅ Created new {attendance_type} for {employee_id}")
            
            return str(result.inserted_id) if hasattr(result, 'inserted_id') else "updated"
            
        except Exception as e:
            print(f"❌ Error recording {attendance_type}: {e}")
            traceback.print_exc()
            return None

    def _calculate_attendance_status(self, timestamp, attendance_type):
        """Hitung status attendance"""
        hour = timestamp.hour
        minute = timestamp.minute
        
        if attendance_type == 'check_in':
            if hour < 9 or (hour == 9 and minute == 0):
                return 'ontime', 0
            elif hour == 9 and minute > 0:
                return 'late', minute
            else:
                return 'late', (hour - 9) * 60 + minute
        else:
            if hour >= 17:
                return 'ontime', 0
            elif hour >= 16:
                return 'early', (17 - hour) * 60 - minute
            else:
                return 'early', (17 - hour) * 60 - minute

    def _calculate_work_duration(self, check_in_time, check_out_time):
        """Hitung durasi kerja dalam menit"""
        if isinstance(check_in_time, str):
            check_in_time = datetime.fromisoformat(check_in_time.replace('Z', '+00:00'))
        if isinstance(check_out_time, str):
            check_out_time = datetime.fromisoformat(check_out_time.replace('Z', '+00:00'))
        
        duration = check_out_time - check_in_time
        return int(duration.total_seconds() / 60)

    # ==================== ATTENDANCE QUERIES ====================
    
    def get_attendance_by_date(self, date_str=None):
        """Get attendance logs by date"""
        try:
            if date_str == 'all':
                query = {}
            elif date_str:
                query = {'date': date_str}
            else:
                date_str = datetime.now().strftime('%Y-%m-%d')
                query = {'date': date_str}
            
            results = list(self.attendance.find(query).sort('timestamp', -1))
            
            formatted_results = []
            for r in results:
                formatted_record = {
                    '_id': str(r.get('_id')),
                    'employee_id': r.get('employee_id'),
                    'employees': r.get('employees'),
                    'department': r.get('department'),
                    'date': r.get('date'),
                    'day_of_week': r.get('day_of_week'),
                    'check_in_time': r.get('check_in_time').isoformat() if r.get('check_in_time') else None,
                    'check_out_time': r.get('check_out_time').isoformat() if r.get('check_out_time') else None,
                    'check_in_status': r.get('check_in_status'),
                    'check_out_status': r.get('check_out_status'),
                    'work_duration': r.get('work_duration'),
                    'lateness_minutes': r.get('lateness_minutes'),
                    'confidence': r.get('confidence')
                }
                formatted_results.append(formatted_record)
            
            return formatted_results

        except Exception as e:
            print(f"❌ Error getting attendance logs: {e}")
            return []

# Global instance
db = MongoDBManager()