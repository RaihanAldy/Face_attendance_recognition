from pymongo import MongoClient
from datetime import datetime, time, timedelta
import calendar
import os
from dotenv import load_dotenv
import traceback
import uuid

load_dotenv()

class MongoDBManager:
    def __init__(self):
        self.client = MongoClient(os.getenv('MONGODB_URI', 'mongodb+srv://db_user:RwSakAlJOcc7ZNC9@facerecognition.e2qalds.mongodb.net/'))
        self.db = self.client[os.getenv('DATABASE_NAME', 'attendance_system')]
        self.employees = self.db.employees
        self.attendance = self.db.attendance
        self.analytics = self.db.analytics
        self.system_logs = self.db.system_logs
        self.settings = self.db.settings
        
        self._create_indexes()
        self._init_default_settings()
        print("✅ MongoDB Manager initialized")

    def _init_default_settings(self):
        """Initialize default settings if not exists"""
        try:
            existing = self.settings.find_one({'_id': 'default'})
            if not existing:
                default_settings = {
                    '_id': 'default',
                    'startTime': '08:00',
                    'endTime': '17:00',
                    'lateThreshold': 15,
                    'earlyLeaveThreshold': 30,
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                self.settings.insert_one(default_settings)
                print("✅ Default settings initialized")
        except Exception as e:
            print(f"⚠️ Error initializing default settings: {e}")

    # ==================== SETTINGS MANAGEMENT ====================

    def get_settings(self):
        """Get current system settings"""
        try:
            settings = self.settings.find_one({'_id': 'default'})
            if settings:
                settings.pop('_id', None)
                if 'created_at' in settings:
                    settings['created_at'] = settings['created_at'].isoformat()
                if 'updated_at' in settings:
                    settings['updated_at'] = settings['updated_at'].isoformat()
                return {'success': True, 'settings': settings}
            else:
                return {'success': False, 'error': 'Settings not found'}
        except Exception as e:
            print(f"❌ Error getting settings: {e}")
            return {'success': False, 'error': str(e)}

    def update_settings(self, settings_data):
        """Update system settings"""
        try:
            required_fields = ['startTime', 'endTime']
            for field in required_fields:
                if field not in settings_data:
                    return {'success': False, 'error': f'Missing required field: {field}'}
            
            start_time = settings_data['startTime']
            end_time = settings_data['endTime']
            
            if start_time >= end_time:
                return {'success': False, 'error': 'End time must be after start time'}
            
            
            update_data = {
                'startTime': start_time,
                'endTime': end_time,
                'lateThreshold': settings_data.get('lateThreshold', 15),
                'earlyLeaveThreshold': settings_data.get('earlyLeaveThreshold', 30),
                'updated_at': datetime.now()
            }
            
            result = self.settings.update_one(
                {'_id': 'default'},
                {'$set': update_data},
                upsert=True
            )
            
            if result.modified_count > 0 or result.upserted_id:
                print(f"✅ Settings updated successfully")
                return {'success': True, 'message': 'Settings updated successfully'}
            else:
                return {'success': False, 'error': 'No changes made'}
                
        except Exception as e:
            print(f"❌ Error updating settings: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def get_work_schedule(self):
        """Get work schedule for attendance validation"""
        try:
            settings = self.settings.find_one({'_id': 'default'})
            if settings:
                return {
                    'start_time': settings.get('startTime', '08:00'),
                    'end_time': settings.get('endTime', '17:00'),
                    'late_threshold': settings.get('lateThreshold', 15),
                    'early_leave_threshold': settings.get('earlyLeaveThreshold', 30)
                }
            return None
        except Exception as e:
            print(f"❌ Error getting work schedule: {e}")
            return None
    
    def _create_indexes(self):
        """Create necessary indexes untuk struktur baru"""
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        self.attendance.create_index('date')
        self.attendance.create_index([('employee_id', 1), ('date', 1)])
        print("✅ Database indexes created")

    # ==================== ATTENDANCE STATUS CALCULATION ====================
    
    def calculate_attendance_status(self, timestamp, action):
        """
        Calculate attendance status based on time and settings
        Untuk check_in: 'ontime' atau 'late' (hanya dalam jam kerja)
        Untuk check_out: 'ontime' atau 'early' (hanya dalam jam kerja)
        Untuk di luar jam kerja: selalu 'ontime'
        """
        try:
            # Ambil settings dari database
            settings = self.settings.find_one({'_id': 'default'})
            if not settings:
                return 'ontime'
            
            start_time_str = settings.get('startTime', '08:00')
            end_time_str = settings.get('endTime', '17:00')
            late_threshold = settings.get('lateThreshold', 15)  # menit
            early_leave_threshold = settings.get('earlyLeaveThreshold', 30)  # menit
            
            # Parse waktu
            start_hour, start_min = map(int, start_time_str.split(':'))
            end_hour, end_min = map(int, end_time_str.split(':'))
            
            # Buat datetime objects untuk comparison
            current_time = timestamp.time()
            start_time = time(start_hour, start_min)
            end_time = time(end_hour, end_min)
            
            # ✅ PERBAIKAN: Cek apakah di luar jam kerja
            if current_time < start_time or current_time > end_time:
                print(f"⚠️ Di luar jam kerja: {current_time} (Jam kerja: {start_time} - {end_time})")
                return 'ontime'  # Di luar jam kerja selalu dianggap ontime
            
            # Hitung threshold times
            start_time_with_threshold = time(
                start_hour, 
                (start_min + late_threshold) % 60 + (start_min + late_threshold) // 60
            )
            end_time_with_threshold = time(
                end_hour, 
                (end_min - early_leave_threshold) % 60 + (end_min - early_leave_threshold) // 60
            )
            
            print(f"🔍 Status calculation:")
            print(f"   Current time: {current_time}")
            print(f"   Start time: {start_time} (threshold: {start_time_with_threshold})")
            print(f"   End time: {end_time} (threshold: {end_time_with_threshold})")
            print(f"   Action: {action}")
            
            if action == 'check_in':
                # Check-in <= startTime+threshold = ontime
                # Check-in > startTime+threshold = late
                if current_time <= start_time_with_threshold:
                    status = 'ontime'
                    print(f"   ✅ Check-in ONTIME (<= {start_time_with_threshold})")
                else:
                    status = 'late'
                    print(f"   ⚠️ Check-in LATE (> {start_time_with_threshold})")
            
            elif action == 'check_out':
                # Check-out >= endTime-threshold = ontime
                # Check-out < endTime-threshold = early
                if current_time >= end_time_with_threshold:
                    status = 'ontime'
                    print(f"   ✅ Check-out ONTIME (>= {end_time_with_threshold})")
                else:
                    status = 'early'
                    print(f"   ⚠️ Check-out EARLY (< {end_time_with_threshold})")
            else:
                status = 'ontime'
            
            print(f"   Final status: {status}")
            return status
            
        except Exception as e:
            print(f"❌ Error calculating attendance status: {e}")
            traceback.print_exc()
            return 'ontime'

    # ==================== EMPLOYEE MANAGEMENT ====================
    def _add_sample_employee(self):
        """Add sample employee untuk testing face recognition"""
        try:
            sample_exists = self.employees.find_one({'employee_id': 'EMP-001'})
            if not sample_exists:
                sample_embedding = [0.1] * 128  # Embedding konsisten
                self.employees.insert_one({
                    'employee_id': 'EMP-001',
                    'name': 'Test Employee',
                    'department': 'IT', 
                    'position': 'Developer',
                    'face_embeddings': sample_embedding,
                    'created_at': datetime.now(),
                    'last_updated': datetime.now()
                })
                print("✅ Sample employee added for testing")
        except Exception as e:
            print(f"⚠️ Error adding sample employee: {e}")
    
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
                    # Multiple embeddings: [[512], [512], ...]
                    embeddings_to_store = face_embeddings
                    embedding_count = len(face_embeddings)
                elif len(face_embeddings) == 512 or len(face_embeddings) == 128:
                    # Single embedding: [512] atau [128]
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
                if len(emb) not in [128, 512]:  # Support both DeepFace (128) and InsightFace (512)
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
                'face_embeddings': embeddings_to_store,  # Store as array of arrays
                'embedding_count': embedding_count,
                'embedding_dimensions': len(embeddings_to_store[0]),
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            }
            
            result = self.employees.insert_one(employee_data)
            
            if result.inserted_id:
                print(f"✅ Employee registered: {employee_id} - {name}")
                print(f"   Embeddings: {embedding_count} x {len(embeddings_to_store[0])}D")
                return {
                    'success': True,
                    'message': 'Employee registered successfully',
                    'employee_id': employee_id,
                    'embedding_count': embedding_count
                }
            else:
                return {'success': False, 'error': 'Failed to insert employee'}
                
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
    
    def calculate_similarity(self, embedding1, embedding2):
        """
        Calculate cosine similarity between two embeddings
        Works for both DeepFace (128D) and InsightFace (512D)
        
        Args:
            embedding1: List [N]
            embedding2: List [N]
            
        Returns:
            float: Similarity score (0-1)
        """
        try:
            if len(embedding1) != len(embedding2):
                print(f"⚠️ Embedding dimension mismatch: {len(embedding1)} vs {len(embedding2)}")
                # Trim to same length
                min_length = min(len(embedding1), len(embedding2))
                embedding1 = embedding1[:min_length]
                embedding2 = embedding2[:min_length]
            
            # Convert to numpy for efficiency
            import numpy as np
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)
            
            # Calculate norms
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            
            # Avoid division by zero
            if norm1 == 0 or norm2 == 0:
                print("⚠️ Zero norm detected in embedding")
                return 0.0
            
            # Normalize
            emb1_normalized = emb1 / norm1
            emb2_normalized = emb2 / norm2
            
            # Cosine similarity (dot product of normalized vectors)
            similarity = np.dot(emb1_normalized, emb2_normalized)
            
            # Clip to 0-1 range (cosine can be -1 to 1, but for faces should be 0-1)
            similarity = float(np.clip(similarity, 0.0, 1.0))
            
            return similarity
            
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            traceback.print_exc()
            return 0.0
        
    def recognize_face(self, face_embedding, threshold=0.6):
        try:
            print(f"🔍 Recognizing face - embedding size: {len(face_embedding)}")
            
            employees = list(self.employees.find())
            
            if len(employees) == 0:
                print("⚠️ No employees registered in database")
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
                
                # Handle both old format (single embedding) and new format (array of embeddings)
                if not isinstance(embeddings[0], list):
                    # Old format: single embedding as flat list
                    embeddings = [embeddings]
                
                # Calculate similarity dengan setiap stored embedding
                max_similarity_for_employee = 0
                
                for stored_embedding in embeddings:
                    # Validate dimensions match
                    if len(stored_embedding) != len(face_embedding):
                        print(f"⚠️ Dimension mismatch for {employee['employee_id']}: {len(stored_embedding)} vs {len(face_embedding)}")
                        continue
                    
                    similarity = self.calculate_similarity(face_embedding, stored_embedding)
                    
                    if similarity > max_similarity_for_employee:
                        max_similarity_for_employee = similarity
                
                print(f"   {employee['employee_id']} ({employee['name']}): similarity = {max_similarity_for_employee:.3f}")
                
                # Update best match jika similarity lebih tinggi DAN melebihi threshold
                if max_similarity_for_employee > highest_similarity and max_similarity_for_employee >= threshold:
                    highest_similarity = max_similarity_for_employee
                    best_match = employee
            
            if best_match:
                print(f"✅ Match found: {best_match['name']} ({best_match['employee_id']})")
                print(f"   Similarity: {highest_similarity:.3f} (threshold: {threshold})")
                
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
                print(f"⚠️ No match found. Best similarity: {highest_similarity:.3f} (threshold: {threshold})")
                return {
                    'success': False,
                    'message': 'No matching employee found',
                    'similarity': highest_similarity,
                    'threshold': threshold
                }
                
        except Exception as e:
            print(f"❌ Error recognizing face: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
        
    # ==================== ATTENDANCE LOGGING ====================
    
    def record_attendance_auto(self, employee_id, confidence=0.0):
        try:
            # Ambil employee data
            employee = self.employees.find_one({'employee_id': employee_id})
            if not employee:
                print(f"❌ Employee {employee_id} not found in database")
                return {'success': False, 'error': f'Employee {employee_id} not found'}

            employee_name = employee.get('name', 'Unknown Employee')
            today_str = datetime.now().strftime('%Y-%m-%d')
            timestamp = datetime.now()

            print(f"\n{'='*60}")
            print(f"📝 RECORD_ATTENDANCE_AUTO")
            print(f"{'='*60}")
            print(f"Employee ID: {employee_id}")
            print(f"Employee Name: {employee_name}")
            print(f"Date: {today_str}")
            print(f"Timestamp: {timestamp}")

            # Cari existing record
            existing_record = self.attendance.find_one({
                'employee_id': employee_id,
                'date': today_str
            })

            print(f"Existing record: {'Yes' if existing_record else 'No'}")

            # Tentukan aksi otomatis (check-in / check-out)
            attendance_type = 'check_in'
            if existing_record and existing_record.get('checkin') and not existing_record.get('checkout'):
                attendance_type = 'check_out'
                print(f"Action: CHECK-OUT (already has check-in)")
            else:
                print(f"Action: CHECK-IN")

            # ✅ HITUNG STATUS BERDASARKAN SETTINGS
            status = self.calculate_attendance_status(timestamp, attendance_type)
            print(f"Calculated status: {status}")

            if attendance_type == 'check_in':
                record_data = {
                    'employee_id': employee_id,
                    'employee_name': employee_name,
                    'date': today_str,
                    'checkin': {
                        'status': status,  # ✅ GUNAKAN STATUS YANG DIHITUNG
                        'timestamp': timestamp.isoformat()
                    },
                    'createdAt': timestamp,
                    'updatedAt': timestamp
                }

                # Insert or update
                result = self.attendance.update_one(
                    {'employee_id': employee_id, 'date': today_str},
                    {'$set': record_data},
                    upsert=True
                )

                print(f"✅ Check-in recorded - Status: {status}")
                return {
                    'success': True, 
                    'message': 'Check-in recorded', 
                    'action': 'check_in',
                    'status': status,  # ✅ KIRIM STATUS KE FRONTEND
                    'employee_name': employee_name,
                    'data': record_data
                }

            elif attendance_type == 'check_out':
                # Update dokumen dengan data checkout
                update_fields = {
                    'checkout': {
                        'status': status,  # ✅ GUNAKAN STATUS YANG DIHITUNG
                        'timestamp': timestamp.isoformat()
                    },
                    'updatedAt': timestamp
                }

                # Hitung durasi kerja jika checkin ada
                if existing_record and existing_record.get('checkin'):
                    checkin_time = datetime.fromisoformat(
                        existing_record['checkin']['timestamp'].replace('Z', '+00:00')
                    )
                    diff_minutes = int((timestamp - checkin_time).total_seconds() / 60)
                    update_fields['work_duration_minutes'] = diff_minutes
                    print(f"Work duration: {diff_minutes} minutes")

                result = self.attendance.update_one(
                    {'employee_id': employee_id, 'date': today_str},
                    {'$set': update_fields}
                )

                print(f"✅ Check-out recorded - Status: {status}")
                return {
                    'success': True, 
                    'message': 'Check-out recorded', 
                    'action': 'check_out',
                    'status': status,  # ✅ KIRIM STATUS KE FRONTEND
                    'employee_name': employee_name,
                    'data': update_fields
                }

        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}




    def get_all_attendance(self):
        """Ambil semua data attendance (format baru)."""
        try:
            records = list(self.attendance.find().sort('date', -1))
            formatted = []

            for rec in records:
                formatted.append({
                    '_id': str(rec.get('_id')),
                    'employee_id': rec.get('employee_id'),
                    'employee_name': rec.get('employee_name'),
                    'date': rec.get('date'),
                    'checkin': rec.get('checkin'),
                    'checkout': rec.get('checkout'),
                    'work_duration_minutes': rec.get('work_duration_minutes', 0),
                    'createdAt': rec.get('createdAt'),
                    'updatedAt': rec.get('updatedAt')
                })
            print(f"✅ Loaded {len(formatted)} attendance records")
            return formatted

        except Exception as e:
            print(f"❌ Error getting all attendance: {e}")
            return []
        
    def get_last_attendance_status(self, employee_id):
        """Get status attendance terakhir untuk employee tertentu"""
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
        """Get attendance data dengan pairing check-in/check-out"""
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
                        '_id': '$employee_id',
                        'records': {
                            '$push': {
                                'action': '$action',
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
                        'localField': '_id',
                        'foreignField': 'employee_id',
                        'as': 'employee_info'
                    }
                },
                {
                    '$project': {
                        'employeeId': '$_id',
                        'name': {
                            '$ifNull': [
                                {'$arrayElemAt': ['$employee_info.name', 0]},
                                'Unknown'
                            ]
                        },
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
                                                'cond': {'$eq': ['$$record.action', 'check_in']}
                                            }
                                        },
                                        'as': 'filtered',
                                        'in': '$$filtered.timestamp'
                                    }
                                },
                                0
                            ]
                        },
                        'checkInStatus': {
                            '$arrayElemAt': [
                                {
                                    '$map': {
                                        'input': {
                                            '$filter': {
                                                'input': '$records',
                                                'as': 'record',
                                                'cond': {'$eq': ['$$record.action', 'check_in']}
                                            }
                                        },
                                        'as': 'filtered',
                                        'in': '$$filtered.status'
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
                                                'cond': {'$eq': ['$$record.action', 'check_out']}
                                            }
                                        },
                                        'as': 'filtered',
                                        'in': '$$filtered.timestamp'
                                    }
                                },
                                0
                            ]
                        },
                        'checkOutStatus': {
                            '$arrayElemAt': [
                                {
                                    '$map': {
                                        'input': {
                                            '$filter': {
                                                'input': '$records',
                                                'as': 'record',
                                                'cond': {'$eq': ['$$record.action', 'check_out']}
                                            }
                                        },
                                        'as': 'filtered',
                                        'in': '$$filtered.status'
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
                    'checkInStatus': item.get('checkInStatus', 'ontime'),
                    'checkOut': check_out.isoformat() if check_out else None,
                    'checkOutStatus': item.get('checkOutStatus', 'ontime'),
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
        """Ambil data absensi dengan EMPLOYEE NAME YANG KONSISTEN"""
        try:
            if not date_str:
                date_str = datetime.now().strftime('%Y-%m-%d')

            if date_str == 'all':
                query = {}
            else:
                query = {'date': date_str}
                
            records = list(self.attendance.find(query))
            
            print(f"\n{'='*60}")
            print(f"📊 GET_ATTENDANCE_BY_DATE - ENHANCED")
            print(f"{'='*60}")
            print(f"Found: {len(records)} records")
            
            formatted = []

            for rec in records:
                employee_id = rec.get('employee_id')
                employee_name = rec.get('employee_name')
                
                # ✅ FALLBACK: JIKA EMPLOYEE_NAME MASIH NULL, CARI DARI EMPLOYEES COLLECTION
                if not employee_name or employee_name == 'Unknown Employee':
                    employee_data = self.employees.find_one({'employee_id': employee_id})
                    if employee_data:
                        employee_name = employee_data.get('name', 'Unknown Employee')
                        # ✅ AUTO-UPDATE RECORD YANG MASIH BERMASALAH
                        self.attendance.update_one(
                            {'_id': rec['_id']},
                            {'$set': {'employee_name': employee_name}}
                        )
                        print(f"🔄 Auto-fixed employee_name for {employee_id}: {employee_name}")
                    else:
                        employee_name = 'Unknown Employee'
                
                formatted_record = {
                    '_id': str(rec.get('_id')),
                    'employee_id': employee_id,
                    'employee_name': employee_name,  # ✅ SELALU ADA DAN BENAR
                    'date': rec.get('date'),
                    'checkin': rec.get('checkin'),
                    'checkout': rec.get('checkout'),
                    'work_duration_minutes': rec.get('work_duration_minutes', 0),
                    'createdAt': rec.get('createdAt'),
                    'updatedAt': rec.get('updatedAt')
                }
                
                formatted.append(formatted_record)

            print(f"✅ Returning {len(formatted)} CONSISTENT records")
            print(f"{'='*60}\n")
            
            return formatted

        except Exception as e:
            print(f"❌ Error getting attendance by date: {e}")
            traceback.print_exc()
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

    def get_attendance_by_employee_id(self, employee_id, limit=30):
        """Ambil semua record absensi untuk karyawan tertentu."""
        try:
            records = list(self.attendance.find({'employee_id': employee_id}).sort('date', -1).limit(limit))
            formatted = []

            for rec in records:
                formatted.append({
                    '_id': str(rec.get('_id')),
                    'employee_id': rec.get('employee_id'),
                    'employee_name': rec.get('employee_name'),
                    'date': rec.get('date'),
                    'checkin': rec.get('checkin'),
                    'checkout': rec.get('checkout'),
                    'work_duration_minutes': rec.get('work_duration_minutes', 0),
                    'createdAt': rec.get('createdAt'),
                    'updatedAt': rec.get('updatedAt')
                })

            print(f"✅ Found {len(formatted)} records for {employee_id}")
            return formatted

        except Exception as e:
            print(f"❌ Error getting employee attendance: {e}")
            traceback.print_exc()
            return []
    # ==================== STATISTICS & ANALYTICS ====================
    
    def get_attendance_stats(self):
        """Get attendance statistics for today"""
        try:
            start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            total_employees = self.employees.count_documents({})
            
            present_today = len(self.attendance.distinct('employee_id', {
                'timestamp': {'$gte': start_of_day},
                'action': 'check_in'
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
                        'employees': 1,
                        'action': 1,
                        'status': 1,
                        'timestamp': 1,
                        'confidence': 1,
                        'employeeId': '$employee_id',
                        'name': '$employees',
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
                    item['timestamp'] = item['timestamp'].isoformat()
            
            return results
        except Exception as e:
            print(f"❌ Error getting recent recognitions: {e}")
            return []

# Global instance
db = MongoDBManager()