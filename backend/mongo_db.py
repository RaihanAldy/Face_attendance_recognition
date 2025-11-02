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
        """Create necessary indexes"""
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        self.attendance.create_index('date')
        self.attendance.create_index([('employee_id', 1), ('date', 1)])
        self.attendance.create_index([('employee_id', 1), ('date', 1), ('action', 1)])
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
        """Record attendance dengan struktur simplified"""
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
            
            # Tentukan status dan action
            action = "check-in" if attendance_type == 'check_in' else "check-out"
            status, lateness_minutes = self._calculate_attendance_status(current_time, attendance_type)
            
            # ✅ STRUKTUR BARU: Setiap check-in/check-out adalah record terpisah
            attendance_data = {
                'employee_id': employee_id,
                'employees': existing_employee['name'],  # Field 'employees' untuk nama
                'department': existing_employee.get('department', 'General'),
                'date': date_str,
                'day_of_week': day_of_week,
                'timestamp': current_time,
                'action': action,  # "check-in" atau "check-out"
                'status': status,  # "ontime", "late", "early"
                'lateness_minutes': lateness_minutes,
                'work_duration': 0,  # Default 0, akan dihitung nanti
                'confidence': confidence
            }
            
            result = self.attendance.insert_one(attendance_data)
            
            # ✅ Hitung work_duration jika ada check-out
            if attendance_type == 'check_out':
                self._update_work_duration(employee_id, date_str)
            
            print(f"✅ Recorded {action} for {employee_id}")
            return str(result.inserted_id)
            
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
        else:  # check_out
            if hour >= 17:
                return 'ontime', 0
            elif hour >= 16:
                return 'early', (17 - hour) * 60 - minute
            else:
                return 'early', (17 - hour) * 60 - minute

    def _update_work_duration(self, employee_id, date_str):
        """Update work duration setelah check-out"""
        try:
            # Cari check-in dan check-out untuk hari ini
            check_in = self.attendance.find_one({
                'employee_id': employee_id,
                'date': date_str,
                'action': 'check-in'
            })
            
            check_out = self.attendance.find_one({
                'employee_id': employee_id,
                'date': date_str,
                'action': 'check-out'
            })
            
            if check_in and check_out:
                duration = int((check_out['timestamp'] - check_in['timestamp']).total_seconds() / 60)
                
                # Update work_duration di kedua record
                self.attendance.update_many(
                    {
                        'employee_id': employee_id,
                        'date': date_str
                    },
                    {
                        '$set': {'work_duration': duration}
                    }
                )
                print(f"✅ Updated work duration: {duration} minutes")
        except Exception as e:
            print(f"❌ Error updating work duration: {e}")

    # ==================== ATTENDANCE QUERIES ====================
    
    def get_attendance_by_date(self, date_str=None):
        """Get attendance logs by date - Return individual check-in/check-out records"""
        try:
            if date_str == 'all':
                query = {}
            elif date_str:
                query = {'date': date_str}
            else:
                date_str = datetime.now().strftime('%Y-%m-%d')
                query = {'date': date_str}
            
            results = list(self.attendance.find(query).sort('timestamp', -1))
            
            # ✅ Format sesuai struktur yang sudah ada di DB
            formatted_results = []
            for r in results:
                # ✅ PENTING: Pastikan field 'action' ada dan valid
                action = r.get('action', 'unknown')
                if not action or action not in ['check-in', 'check-out']:
                    # Fallback: Coba deteksi dari field lain
                    if r.get('check_in_time') and not r.get('check_out_time'):
                        action = 'check-in'
                    elif r.get('check_out_time'):
                        action = 'check-out'
                    else:
                        action = 'unknown'
                
                formatted_record = {
                    '_id': str(r.get('_id')),
                    'employee_id': r.get('employee_id'),
                    'employees': r.get('employees'),  # Field 'employees' untuk nama
                    'department': r.get('department'),
                    'date': r.get('date'),
                    'day_of_week': r.get('day_of_week'),
                    'timestamp': r.get('timestamp').isoformat() if r.get('timestamp') else None,
                    'action': action,  # ✅ "check-in" atau "check-out"
                    'status': r.get('status'),  # ✅ "ontime", "late", "early"
                    'lateness_minutes': r.get('lateness_minutes', 0),
                    'work_duration': r.get('work_duration', 0),
                    'confidence': r.get('confidence', 0)
                }
                formatted_results.append(formatted_record)
            
            print(f"✅ Fetched {len(formatted_results)} attendance records")
            
            # Debug: Log sample actions
            if formatted_results:
                action_counts = {}
                for r in formatted_results:
                    action = r['action']
                    action_counts[action] = action_counts.get(action, 0) + 1
                print(f"📊 Action distribution: {action_counts}")
            
            return formatted_results

        except Exception as e:
            print(f"❌ Error getting attendance logs: {e}")
            traceback.print_exc()
            return []

    def get_attendance_with_pairing(self, date_str=None):
        """Get attendance with check-in/check-out paired per employee"""
        try:
            if date_str == 'all':
                query = {}
            elif date_str:
                query = {'date': date_str}
            else:
                date_str = datetime.now().strftime('%Y-%m-%d')
                query = {'date': date_str}
            
            results = list(self.attendance.find(query).sort('timestamp', 1))
            
            # Group by employee
            paired_data = {}
            for r in results:
                emp_id = r.get('employee_id')
                
                if emp_id not in paired_data:
                    paired_data[emp_id] = {
                        'employee_id': emp_id,
                        'employees': r.get('employees'),
                        'department': r.get('department'),
                        'date': r.get('date'),
                        'day_of_week': r.get('day_of_week'),
                        'check_in': None,
                        'check_in_status': None,
                        'check_out': None,
                        'check_out_status': None,
                        'work_duration': 0,
                        'lateness_minutes': 0
                    }
                
                if r.get('action') == 'check-in':
                    paired_data[emp_id]['check_in'] = r.get('timestamp').isoformat() if r.get('timestamp') else None
                    paired_data[emp_id]['check_in_status'] = r.get('status')
                    paired_data[emp_id]['lateness_minutes'] = r.get('lateness_minutes', 0)
                elif r.get('action') == 'check-out':
                    paired_data[emp_id]['check_out'] = r.get('timestamp').isoformat() if r.get('timestamp') else None
                    paired_data[emp_id]['check_out_status'] = r.get('status')
                    paired_data[emp_id]['work_duration'] = r.get('work_duration', 0)
            
            return list(paired_data.values())
            
        except Exception as e:
            print(f"❌ Error getting paired attendance: {e}")
            return []

    def get_attendance_by_employee_id(self, employee_id, date=None):
        """Get attendance history untuk employee tertentu"""
        try:
            query = {'employee_id': employee_id}
            if date:
                query['date'] = date
            
            results = list(self.attendance.find(query).sort('timestamp', -1))
            
            formatted_results = []
            for r in results:
                formatted_record = {
                    '_id': str(r.get('_id')),
                    'employee_id': r.get('employee_id'),
                    'employees': r.get('employees'),
                    'date': r.get('date'),
                    'timestamp': r.get('timestamp').isoformat() if r.get('timestamp') else None,
                    'action': r.get('action'),
                    'status': r.get('status'),
                    'lateness_minutes': r.get('lateness_minutes', 0),
                    'work_duration': r.get('work_duration', 0),
                    'confidence': r.get('confidence', 0)
                }
                formatted_results.append(formatted_record)
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting employee attendance: {e}")
            return []

# Global instance
db = MongoDBManager()