from pymongo import MongoClient
from datetime import datetime, time, timedelta
import os
from dotenv import load_dotenv
import json
import traceback
from bson import ObjectId

load_dotenv()

class MongoDBManager:
    def __init__(self):
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client[os.getenv('DATABASE_NAME')]
        
        self.employees = self.db.employees
        self.attendance = self.db.attendance
        self.pending_attendance = self.db.pending_attendance
        self.analytics = self.db.analytics
        self.system_logs = self.db.system_logs
        
        self._create_indexes()
    
    def _create_indexes(self):
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('date')
        self.attendance.create_index([('employee_id', 1), ('date', 1)])
        self.attendance.create_index('createdAt')
        self.pending_attendance.create_index('created_at')  # ✅ TAMBAH INI
        self.pending_attendance.create_index('status') 
        print("✅ Database indexes created")

    # ==================== SETTINGS MANAGEMENT ====================
    
    def get_work_schedule(self):
        """Get work schedule from settings"""
        try:
            settings = self.db.settings.find_one({'type': 'work_schedule'})
            if settings:
                return {
                    'start_time': settings.get('start_time', '08:00'),
                    'end_time': settings.get('end_time', '17:00')
                }
            else:
                # Default schedule
                return {
                    'start_time': '08:00',
                    'end_time': '17:00'
                }
        except Exception as e:
            print(f"❌ Error getting work schedule: {e}")
            return {
                'start_time': '08:00',
                'end_time': '17:00'
            }

    def get_settings(self):
        """Get system settings"""
        try:
            settings = list(self.db.settings.find())
            result = {}
            for setting in settings:
                result[setting['type']] = setting
            return {'success': True, 'settings': result}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def update_settings(self, data):
        """Update system settings"""
        try:
            for key, value in data.items():
                self.db.settings.update_one(
                    {'type': key},
                    {'$set': {'value': value, 'updated_at': datetime.now()}},
                    upsert=True
                )
            return {'success': True, 'message': 'Settings updated successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ==================== ATTENDANCE STATUS CALCULATION ====================
    
    def calculate_attendance_status(self, timestamp, action):
        """
        Calculate attendance status based on time and settings
        For check_in: 'ontime' or 'late'
        For check_out: 'ontime' or 'early'
        """
        try:
            schedule = self.get_work_schedule()
            if not schedule:
                return 'ontime'
            
            start_time_str = schedule['start_time']
            end_time_str = schedule['end_time']
            
            start_hour, start_min = map(int, start_time_str.split(':'))
            end_hour, end_min = map(int, end_time_str.split(':'))
            
            start_time = time(start_hour, start_min)
            end_time = time(end_hour, end_min)
            
            current_time = timestamp.time()
            
            if action == 'check_in':
                if current_time <= start_time:
                    return 'ontime'
                else:
                    return 'late'
            
            elif action == 'check_out':
                if current_time >= end_time:
                    return 'ontime'
                else:
                    return 'early'
            
            return 'ontime'
            
        except Exception as e:
            print(f"❌ Error calculating attendance status: {e}")
            return 'ontime'

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
    
    def register_employee_face(self, name, face_embeddings, department='General', position='', email='', phone=''):
        try:
            employee_id = self.get_next_employee_id()
            
            # Handle both single dan multiple embeddings
            if isinstance(face_embeddings, list):
                if len(face_embeddings) > 0 and isinstance(face_embeddings[0], list):
                    embeddings_to_store = face_embeddings
                    embedding_count = len(face_embeddings)
                elif len(face_embeddings) == 512 or len(face_embeddings) == 128:
                    embeddings_to_store = [face_embeddings]
                    embedding_count = 1
                else:
                    return {
                        'success': False,
                        'error': f'Invalid embedding format. Expected 512 dimensions, got {len(face_embeddings)}'
                    }
            else:
                return {
                    'success': False,
                    'error': 'face_embeddings must be a list'
                }
            
            # Validate embedding dimensions
            for i, emb in enumerate(embeddings_to_store):
                if len(emb) not in [128, 512]:
                    return {
                        'success': False,
                        'error': f'Embedding {i+1} has invalid dimensions: {len(emb)}. Expected 128 or 512.'
                    }
            
            employee_data = {
                'employee_id': employee_id,
                'name': name,
                'department': department,
                'position': position,
                'email': email,
                'phone': phone,
                'face_embeddings': embeddings_to_store,
                'embedding_count': embedding_count,
                'embedding_dimensions': len(embeddings_to_store[0]),
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            }
            
            result = self.employees.insert_one(employee_data)
            
            if result.inserted_id:
                print(f"✅ Employee registered: {employee_id} - {name}")
                return {
                    'success': True,
                    'message': 'Employee registered successfully',
                    'employee_id': employee_id,
                    'embedding_count': embedding_count
                }
            else:
                return {'success': False, 'error': 'Failed to insert employee'}
                
        except Exception as e:
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
    
    def calculate_similarity(self, embedding1, embedding2):
        """Calculate cosine similarity between two embeddings"""
        try:
            if len(embedding1) != len(embedding2):
                min_length = min(len(embedding1), len(embedding2))
                embedding1 = embedding1[:min_length]
                embedding2 = embedding2[:min_length]
            
            import numpy as np
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)
            
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            emb1_normalized = emb1 / norm1
            emb2_normalized = emb2 / norm2
            
            similarity = np.dot(emb1_normalized, emb2_normalized)
            similarity = float(np.clip(similarity, 0.0, 1.0))
            
            return similarity
            
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            return 0.0
        
    def recognize_face(self, face_embedding, threshold=0.6):
        try:
            print(f"🔍 Recognizing face - embedding size: {len(face_embedding)}")
            
            employees = list(self.employees.find())
            
            if len(employees) == 0:
                return {
                    'success': False,
                    'message': 'No employees registered in database',
                    'similarity': 0
                }
            
            best_match = None
            highest_similarity = 0
            
            for employee in employees:
                if 'face_embeddings' not in employee or not employee['face_embeddings']:
                    continue
                
                embeddings = employee['face_embeddings']
                
                if not isinstance(embeddings[0], list):
                    embeddings = [embeddings]
                
                max_similarity_for_employee = 0
                
                for stored_embedding in embeddings:
                    if len(stored_embedding) != len(face_embedding):
                        continue
                    
                    similarity = self.calculate_similarity(face_embedding, stored_embedding)
                    
                    if similarity > max_similarity_for_employee:
                        max_similarity_for_employee = similarity
                
                print(f"   {employee['employee_id']} ({employee['name']}): similarity = {max_similarity_for_employee:.3f}")
                
                if max_similarity_for_employee > highest_similarity and max_similarity_for_employee >= threshold:
                    highest_similarity = max_similarity_for_employee
                    best_match = employee
            
            if best_match:
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
                    'similarity': highest_similarity,
                    'threshold': threshold
                }
                
        except Exception as e:
            print(f"❌ Error recognizing face: {e}")
            return {'success': False, 'error': str(e)}
        
    # ==================== ATTENDANCE LOGGING ====================
    
    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in'):
        """Record attendance dengan struktur sesuai JSON target"""
        try:
            employee = self.employees.find_one({'employee_id': employee_id})
            if not employee:
                return None

            timestamp = datetime.now()
            date_str = timestamp.strftime('%Y-%m-%d')
            
            # Cari record attendance untuk hari ini
            existing_record = self.attendance.find_one({
                'employee_id': employee_id,
                'date': date_str
            })

            if existing_record:
                # Update existing record
                if attendance_type == 'check_out':
                    checkin_time = existing_record.get('checkin', {}).get('timestamp')
                    if checkin_time:
                        work_duration = (timestamp - checkin_time).total_seconds() / 60  # dalam menit
                        
                    update_data = {
                        'checkout': {
                            'status': self.calculate_attendance_status(timestamp, 'check_out'),
                            'timestamp': timestamp
                        },
                        'updatedAt': timestamp,
                        'work_duration_minutes': int(work_duration)
                    }
                    
                    result = self.attendance.update_one(
                        {'_id': existing_record['_id']},
                        {'$set': update_data}
                    )
                    
                    if result.modified_count > 0:
                        print(f"✅ Check-out recorded for {employee_id}")
                        return str(existing_record['_id'])
                
            else:
                # Buat record baru untuk check-in
                if attendance_type == 'check_in':
                    attendance_record = {
                        'date': date_str,
                        'employee_id': employee_id,
                        'employee_name': employee.get('name', 'Unknown'),
                        'checkin': {
                            'status': self.calculate_attendance_status(timestamp, 'check_in'),
                            'timestamp': timestamp
                        },
                        'createdAt': timestamp,
                        'updatedAt': timestamp,
                        'work_duration_minutes': 0
                    }
                    
                    result = self.attendance.insert_one(attendance_record)
                    
                    if result.inserted_id:
                        print(f"✅ Check-in recorded for {employee_id}")
                        return str(result.inserted_id)

            return None
            
        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
            traceback.print_exc()
            return None

    def record_attendance_auto(self, employee_id, confidence=0.0):
        """Auto-detect check-in/check-out dengan struktur JSON target"""
        try:
            # Cari record terakhir untuk employee ini
            last_record = self.attendance.find_one(
                {'employee_id': employee_id},
                sort=[('timestamp', -1)]
            )
            
            print(f"🔍 DEBUG get_last_attendance_status for {employee_id}:")
            print(f"   Last record: {last_record}")
            
            if not last_record:
                return None  # Tidak ada record sebelumnya
                
            return {
                'last_action': last_record.get('action'),  # ✅ PASTIKAN FIELD NAME BENAR
                'last_timestamp': last_record.get('timestamp'),
                'last_date': last_record.get('date')
            }
            
        except Exception as e:
            print(f"❌ Error getting last attendance status: {e}")
            return None

    def determine_attendance_action(self, employee_id):
        """Tentukan action otomatis (check-in atau check-out) - DEBUG VERSION"""
        try:
            last_status = self.get_last_attendance_status(employee_id)
            
            print(f"🔍 DEBUG determine_attendance_action for {employee_id}:")
            print(f"   Last status: {last_status}")
            
            if not last_status:
                print("   ➡️ No previous record -> CHECK_IN")
                return 'check_in'
                
            last_action = last_status.get('last_action')
            last_date = last_status.get('last_date')
            current_date = datetime.now().strftime('%Y-%m-%d')
            
            print(f"   Last action: '{last_action}'")
            print(f"   Last date: '{last_date}'")
            print(f"   Current date: '{current_date}'")
            
            # Jika hari berbeda, selalu check-in
            if last_date != current_date:
                print("   ➡️ Different day -> CHECK_IN")
                return 'check_in'
                
            # Jika hari sama, toggle berdasarkan action terakhir
            if last_action == 'check_in':  # ✅ PASTIKAN INI 'check_in' BUKAN 'check-in'
                print("   ➡️ Last was check_in -> CHECK_OUT")
                return 'check_out'
            else:
                print("   ➡️ Last was check_out or other -> CHECK_IN")
                return 'check_in'
                
        except Exception as e:
            print(f"❌ Error determining attendance action: {e}")
            return 'check_in' # Fallback ke check-in
        
    # ==================== ATTENDANCE QUERIES ====================
    
    def get_attendance_with_checkout(self, date_str=None):
        """Get attendance records for a given date (using new structure)"""
        try:
            if not date_str:
                date_str = datetime.now().strftime('%Y-%m-%d')

            query = {'date': date_str} if date_str != 'all' else {}
            records = list(self.attendance.find(query).sort('employee_id', 1))

            formatted = []
            for rec in records:
                checkin = rec.get('checkin', {})
                checkout = rec.get('checkout', {})
                formatted.append({
                    '_id': str(rec.get('_id')),
                    'employee_id': rec.get('employee_id'),
                    'employee_name': rec.get('employee_name', 'Unknown'),
                    'department': rec.get('department', 'General'),
                    'checkIn': checkin.get('timestamp'),
                    'checkInStatus': checkin.get('status'),
                    'checkOut': checkout.get('timestamp'),
                    'checkOutStatus': checkout.get('status'),
                    'workDuration': f"{rec.get('work_duration_minutes', 0)//60}h {rec.get('work_duration_minutes', 0)%60}m",
                    'status': 'Present' if checkin else 'Absent',
                    'createdAt': rec.get('createdAt'),
                    'updatedAt': rec.get('updatedAt'),
                })

            print(f"✅ Found {len(formatted)} attendance records for {date_str}")
            return formatted
        except Exception as e:
            print(f"❌ Error getting pending attendance: {e}")
            return []


    def approve_pending_attendance(self, pending_id):
        """Approve pending attendance dan pindahkan ke attendance collection"""
        try:
            # Cari pending record
            pending_record = self.pending_attendance.find_one({'_id': ObjectId(pending_id)})
            
            if not pending_record:
                return {'success': False, 'error': 'Pending attendance not found'}
            
            # Cari employee berdasarkan nama
            employee = self.employees.find_one({'name': pending_record.get('employee_name')})
            
            if not employee:
                return {'success': False, 'error': 'Employee not found'}
            
            # Buat attendance record baru
            attendance_record = {
                'date': pending_record.get('date'),
                'employee_id': employee.get('employee_id'),
                'employee_name': pending_record.get('employee_name'),
                'timestamp': pending_record.get('timestamp'),
                'type': 'manual_approved',
                'status': 'present',
                'approved_at': datetime.now(),
                'photo': pending_record.get('photo'),  # Simpan foto juga jika perlu
                'created_at': datetime.now()
            }
            
            # Simpan ke attendance collection
            attendance_result = self.attendance.insert_one(attendance_record)
            
            # Hapus dari pending_attendance
            self.pending_attendance.delete_one({'_id': ObjectId(pending_id)})
            
            return {
                'success': True,
                'message': 'Attendance approved successfully',
                'attendance_id': str(attendance_result.inserted_id),
                'employee_name': pending_record.get('employee_name')
            }
            
        except Exception as e:
            print(f"❌ Error approving pending attendance: {e}")
            return {'success': False, 'error': str(e)}

    def reject_pending_attendance(self, pending_id, reason=None):
        """Reject pending attendance"""
        try:
            # Update status menjadi rejected
            result = self.pending_attendance.update_one(
                {'_id': ObjectId(pending_id)},
                {
                    '$set': {
                        'status': 'rejected',
                        'rejected_at': datetime.now(),
                        'rejection_reason': reason
                    }
                }
            )
            
            if result.modified_count > 0:
                return {'success': True, 'message': 'Attendance rejected successfully'}
            else:
                return {'success': False, 'error': 'Pending attendance not found'}
                
        except Exception as e:
            print(f"❌ Error rejecting pending attendance: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== ATTENDANCE QUERIES ====================
    
    def get_attendance_by_date(self, date_str=None):
        """Get attendance data for specific date dengan struktur JSON target"""
        try:
            if not date_str:
                date_str = datetime.now().strftime('%Y-%m-%d')
            
            attendance_records = list(self.attendance.find({'date': date_str}))
            
            formatted_results = []
            for record in attendance_records:
                formatted_record = {
                    '_id': str(record.get('_id')),
                    'date': record.get('date'),
                    'employee_id': record.get('employee_id'),
                    'employee_name': record.get('employee_name'),
                    'checkin': None,
                    'checkout': None,
                    'work_duration_minutes': record.get('work_duration_minutes', 0),
                    'createdAt': record.get('createdAt').isoformat() if record.get('createdAt') else None,
                    'updatedAt': record.get('updatedAt').isoformat() if record.get('updatedAt') else None
                }
                
                if record.get('checkin'):
                    formatted_record['checkin'] = {
                        'status': record['checkin'].get('status'),
                        'timestamp': record['checkin'].get('timestamp').isoformat() if record['checkin'].get('timestamp') else None
                    }
                
                if record.get('checkout'):
                    formatted_record['checkout'] = {
                        'status': record['checkout'].get('status'),
                        'timestamp': record['checkout'].get('timestamp').isoformat() if record['checkout'].get('timestamp') else None
                    }
                
                formatted_results.append(formatted_record)
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting attendance by date: {e}")
            return []

    def get_attendance_with_checkout(self, date_str=None):
        """
        Get attendance data dengan pairing check-in/check-out untuk view gabungan
        """
        try:
            if date_str and date_str != 'all':
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                match_filter = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
            else:
                match_filter = {}

            pipeline = [
                {
                    '$match': match_filter
                },
                {
                    '$sort': {'timestamp': 1}
                },
                {
                    '$group': {
                        '_id': '$employee_id',
                        'employee_id': {'$first': '$employee_id'},
                        'check_in': {
                            '$min': {
                                '$cond': [
                                    {'$eq': ['$action', 'check_in']},
                                    '$timestamp',
                                    None
                                ]
                            }
                        },
                        'check_out': {
                            '$max': {
                                '$cond': [
                                    {'$eq': ['$action', 'check_out']},
                                    '$timestamp',
                                    None
                                ]
                            }
                        },
                        'check_in_status': {
                            '$first': {
                                '$cond': [
                                    {'$eq': ['$action', 'check_in']},
                                    '$status',
                                    None
                                ]
                            }
                        },
                        'check_out_status': {
                            '$first': {
                                '$cond': [
                                    {'$eq': ['$action', 'check_out']},
                                    '$status',
                                    None
                                ]
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
                    '$unwind': '$employee_info'
                },
                {
                    '$project': {
                        '_id': 1,
                        'employeeId': '$employee_id',
                        'name': '$employee_info.name',
                        'employees': '$employee_info.name',
                        'checkIn': '$check_in',
                        'checkOut': '$check_out',
                        'checkInStatus': '$check_in_status',
                        'checkOutStatus': '$check_out_status',
                        'department': '$employee_info.department',
                        'workingHours': {
                            '$cond': [
                                {'$and': ['$check_in', '$check_out']},
                                {
                                    '$divide': [
                                        {'$subtract': ['$check_out', '$check_in']},
                                        3600000  # Convert to hours
                                    ]
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
                formatted_item = {
                    '_id': str(item.get('_id', '')),
                    'employeeId': item.get('employeeId', 'N/A'),
                    'name': item.get('name', 'Unknown'),
                    'employees': item.get('employees', 'Unknown'),
                    'checkIn': item.get('checkIn').isoformat() if item.get('checkIn') else None,
                    'checkOut': item.get('checkOut').isoformat() if item.get('checkOut') else None,
                    'checkInStatus': item.get('checkInStatus'),
                    'checkOutStatus': item.get('checkOutStatus'),
                    'department': item.get('department', 'General'),
                    'workingHours': f"{int(item.get('workingHours', 0))}h {int((item.get('workingHours', 0) % 1) * 60)}m"
                }
                
                formatted_results.append(formatted_item)
            
            print(f"✅ Found {len(formatted_results)} paired attendance records for {date_str or 'today'}")
            return formatted_results

        except Exception as e:
            print(f"❌ Error getting attendance with checkout: {e}")
            traceback.print_exc()
            return []

    def get_all_attendance(self):
        """Get semua attendance records"""
        try:
            attendance_records = list(self.attendance.find().sort('date', -1))
            
            formatted_results = []
            for record in attendance_records:
                formatted_record = {
                    '_id': str(record.get('_id')),
                    'date': record.get('date'),
                    'employee_id': record.get('employee_id'),
                    'employee_name': record.get('employee_name'),
                    'checkin': None,
                    'checkout': None,
                    'work_duration_minutes': record.get('work_duration_minutes', 0),
                    'createdAt': record.get('createdAt').isoformat() if record.get('createdAt') else None,
                    'updatedAt': record.get('updatedAt').isoformat() if record.get('updatedAt') else None
                }
                
                if record.get('checkin'):
                    formatted_record['checkin'] = {
                        'status': record['checkin'].get('status'),
                        'timestamp': record['checkin'].get('timestamp').isoformat() if record['checkin'].get('timestamp') else None
                    }
                
                if record.get('checkout'):
                    formatted_record['checkout'] = {
                        'status': record['checkout'].get('status'),
                        'timestamp': record['checkout'].get('timestamp').isoformat() if record['checkout'].get('timestamp') else None
                    }
                
                formatted_results.append(formatted_record)
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting all attendance: {e}")
            return []

    def get_attendance_by_employee_id(self, employee_id, date_str=None):
        """Get attendance data untuk employee tertentu"""
        try:
            query = {'employee_id': employee_id}
            
            if date_str:
                query['date'] = date_str
            
            attendance_records = list(self.attendance.find(query).sort('date', -1))
            
            formatted_results = []
            for record in attendance_records:
                formatted_record = {
                    '_id': str(record.get('_id')),
                    'date': record.get('date'),
                    'employee_id': record.get('employee_id'),
                    'employee_name': record.get('employee_name'),
                    'checkin': None,
                    'checkout': None,
                    'work_duration_minutes': record.get('work_duration_minutes', 0),
                    'createdAt': record.get('createdAt').isoformat() if record.get('createdAt') else None,
                    'updatedAt': record.get('updatedAt').isoformat() if record.get('updatedAt') else None
                }
                
                if record.get('checkin'):
                    formatted_record['checkin'] = {
                        'status': record['checkin'].get('status'),
                        'timestamp': record['checkin'].get('timestamp').isoformat() if record['checkin'].get('timestamp') else None
                    }
                
                if record.get('checkout'):
                    formatted_record['checkout'] = {
                        'status': record['checkout'].get('status'),
                        'timestamp': record['checkout'].get('timestamp').isoformat() if record['checkout'].get('timestamp') else None
                    }
                
                formatted_results.append(formatted_record)
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting employee attendance: {e}")
            return []

    # ==================== STATISTICS & ANALYTICS ====================
    
    def get_attendance_stats(self):
        """Get attendance statistics"""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            
            total_employees = self.employees.count_documents({})
            present_today = self.attendance.count_documents({'date': today})
            
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
        """Get daily analytics"""
        try:
            if date is None:
                date = datetime.now().strftime('%Y-%m-%d')
            
            stats = self.get_attendance_stats()
            
            # Hitung late dan early
            late_count = self.attendance.count_documents({
                'date': date,
                'checkin.status': 'late'
            })
            
            early_count = self.attendance.count_documents({
                'date': date,
                'checkout.status': 'early'
            })
            
            analytics_data = {
                'date': date,
                'attendance_rate': stats.get('attendance_rate', 0),
                'total_employees': stats.get('total_employees', 0),
                'present_today': stats.get('present_today', 0),
                'late_count': late_count,
                'early_count': early_count,
                'on_time_count': stats.get('present_today', 0) - late_count
            }
            
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
    
    def get_recent_recognitions(self, limit=10):
        """Get recent check-in/out events using new structure"""
        try:
            records = list(
                self.attendance.find().sort('updatedAt', -1).limit(limit)
            )

            recent = []
            for rec in records:
                checkin = rec.get('checkin', {})
                checkout = rec.get('checkout', {})
                recent.append({
                    '_id': str(rec.get('_id')),
                    'employee_id': rec.get('employee_id'),
                    'employee_name': rec.get('employee_name', 'Unknown'),
                    'department': rec.get('department', 'General'),
                    'last_action': 'check_out' if checkout else 'check_in',
                    'last_status': checkout.get('status') if checkout else checkin.get('status'),
                    'timestamp': checkout.get('timestamp') or checkin.get('timestamp'),
                    'work_duration_minutes': rec.get('work_duration_minutes', 0)
                })

            return recent
        except Exception as e:
            print(f"❌ Error getting recent recognitions: {e}")
            traceback.print_exc()
            return []

# Global instance
db = MongoDBManager()