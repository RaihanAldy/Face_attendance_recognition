from pymongo import MongoClient
from datetime import datetime, time, timedelta
import os
from dotenv import load_dotenv
import traceback
import numpy as np
from bson import ObjectId
import traceback

from notification_service import send_all_notifications


load_dotenv()

class MongoDBManager:
    def __init__(self):
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client[os.getenv('DATABASE_NAME')]
        self.employees = self.db.employees
        self.attendance = self.db.attendance
        self.analytics = self.db.analytics
        self.system_logs = self.db.system_logs
        self.settings = self.db.settings
        self.pending_attendance = self.db.pending_attendance
        
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

        self.pending_attendance.create_index('created_at')
        self.pending_attendance.create_index('status')
        self.pending_attendance.create_index('employee_name')
        self.pending_attendance.create_index([('created_at', -1)])
        self.pending_attendance.create_index([('status', 1), ('created_at', -1)])
        print("✅ Database indexes created")

    # ==================== ATTENDANCE STATUS CALCULATION ====================
    
    def calculate_attendance_status(self, timestamp, action):
        """
        Calculate attendance status based on time and settings
        
        ✅ FIX: Hapus blok "di luar jam kerja" agar tetap bisa detect late
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
 
            if action == 'check_in' and current_time < start_time:
                print(f"✅ Check-in sebelum jam kerja dimulai: {current_time} < {start_time}")
                return 'ontime'
            
            # Hitung threshold times
            late_threshold_minutes = late_threshold
            start_time_with_threshold = (
                datetime.combine(datetime.today(), start_time) + 
                timedelta(minutes=late_threshold_minutes)
            ).time()
            
            early_leave_threshold_minutes = early_leave_threshold
            end_time_with_threshold = (
                datetime.combine(datetime.today(), end_time) - 
                timedelta(minutes=early_leave_threshold_minutes)
            ).time()
            
            print(f"🔍 Status calculation:")
            print(f"   Current time: {current_time}")
            print(f"   Start time: {start_time} (late after: {start_time_with_threshold})")
            print(f"   End time: {end_time} (early before: {end_time_with_threshold})")
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

    def calculate_lateness_minutes(self, timestamp):
        """
        Hitung berapa menit terlambat dari jadwal
        Return 0 jika tidak terlambat
        """
        try:
            settings = self.settings.find_one({'_id': 'default'})
            if not settings:
                return 0
            
            start_time_str = settings.get('startTime', '08:00')
            start_hour, start_min = map(int, start_time_str.split(':'))
            
            scheduled_start = timestamp.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
            
            if timestamp <= scheduled_start:
                return 0  # Tidak terlambat
            
            diff_minutes = int((timestamp - scheduled_start).total_seconds() / 60)
            return max(0, diff_minutes)
            
        except Exception as e:
            print(f"❌ Error calculating lateness: {e}")
            return 0

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
        """
        ✅ FIXED: Auto-sync to DynamoDB when checkout is completed
        """
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

            # ==================== CHECK-IN LOGIC ====================
            if attendance_type == 'check_in':
                record_data = {
                    'employee_id': employee_id,
                    'employee_name': employee_name,
                    'date': today_str,
                    'checkin': {
                        'status': status,
                        'timestamp': timestamp.isoformat()
                    },
                    'createdAt': timestamp,
                    'updatedAt': timestamp,
                    'updated_at': timestamp  # ✅ Add for sync compatibility
                }

                # Insert or update
                result = self.attendance.update_one(
                    {'employee_id': employee_id, 'date': today_str},
                    {'$set': record_data},
                    upsert=True
                )

                print(f"✅ Check-in recorded - Status: {status}")
                
                # ✅ KIRIM NOTIFIKASI JIKA LATE
                if status == 'late':
                    lateness_minutes = self.calculate_lateness_minutes(timestamp)
                    
                    if lateness_minutes > 0:
                        print(f"\n{'='*60}")
                        print(f"⚠️ LATE DETECTION - Triggering Notification")
                        print(f"{'='*60}")
                        print(f"Employee: {employee_name}")
                        print(f"Lateness: {lateness_minutes} minutes")
                        print(f"Email: {employee.get('email', 'Not provided')}")
                        print(f"{'='*60}\n")
                        
                        employee_email = employee.get('email')
                        
                        # ✅ KIRIM NOTIFIKASI (non-blocking)
                        try:
                            send_all_notifications(
                                employee_name=employee_name,
                                employee_email=employee_email,
                                lateness_minutes=lateness_minutes
                            )
                        except Exception as notif_error:
                            print(f"⚠️ Failed to send notification: {notif_error}")
                            traceback.print_exc()
                
                return {
                    'success': True, 
                    'message': 'Check-in recorded', 
                    'action': 'check_in',
                    'status': status,
                    'employee_name': employee_name,
                    'synced_to_dynamodb': False,  # Check-in tidak di-sync
                    'data': record_data
                }

            # ==================== CHECK-OUT LOGIC (WITH AUTO-SYNC) ====================
            elif attendance_type == 'check_out':
                # Update dokumen dengan data checkout
                update_fields = {
                    'checkout': {
                        'status': status,
                        'timestamp': timestamp.isoformat()
                    },
                    'updatedAt': timestamp,
                    'updated_at': timestamp  # ✅ Add for sync compatibility
                }

                # Hitung durasi kerja jika checkin ada
                work_duration = 0
                if existing_record and existing_record.get('checkin'):
                    checkin_time = datetime.fromisoformat(
                        existing_record['checkin']['timestamp'].replace('Z', '+00:00')
                    )
                    work_duration = int((timestamp - checkin_time).total_seconds() / 60)
                    update_fields['work_duration_minutes'] = work_duration
                    print(f"Work duration: {work_duration} minutes")

                # ✅ UPDATE MONGODB FIRST
                result = self.attendance.update_one(
                    {'employee_id': employee_id, 'date': today_str},
                    {'$set': update_fields}
                )

                print(f"✅ Check-out recorded - Status: {status}")

                # ==================== ✅ AUTO-SYNC TO DYNAMODB ====================
                sync_success = False
                try:
                    print(f"\n{'='*60}")
                    print(f"☁️  AUTO-SYNCING TO DYNAMODB")
                    print(f"{'='*60}")
                    
                    # ✅ IMPORT DI DALAM FUNCTION UNTUK AVOID CIRCULAR IMPORT
                    import sync_mongo_to_dynamo
                    
                    # Get the updated record
                    updated_record = self.attendance.find_one({
                        'employee_id': employee_id,
                        'date': today_str
                    })
                    
                    if updated_record:
                        print(f"📋 Updated record found:")
                        print(f"   Employee: {employee_name}")
                        print(f"   Date: {today_str}")
                        print(f"   Has checkout: {bool(updated_record.get('checkout'))}")
                        print(f"   Work duration: {work_duration} minutes")
                        
                        # ✅ CALL SYNC FUNCTION
                        sync_result = sync_mongo_to_dynamo.sync_single_record(updated_record)
                        
                        if sync_result:
                            print(f"✅ Successfully synced to DynamoDB!")
                            sync_success = True
                        else:
                            print(f"⚠️ Sync failed but local save is OK")
                    else:
                        print(f"⚠️ Could not find updated record for sync")
                        
                    print(f"{'='*60}\n")
                    
                except ImportError as import_error:
                    print(f"❌ Failed to import sync module: {import_error}")
                    print(f"⚠️ Make sure sync_mongo_to_dynamo.py is in the same directory")
                    traceback.print_exc()
                except Exception as sync_error:
                    print(f"❌ Auto-sync error (but local save is OK): {sync_error}")
                    traceback.print_exc()

                return {
                    'success': True, 
                    'message': 'Check-out recorded', 
                    'action': 'check_out',
                    'status': status,
                    'employee_name': employee_name,
                    'synced_to_dynamodb': sync_success,
                    'work_duration_minutes': work_duration,
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
    
    def get_attendance_stats(self, date_str=None):
        """Get attendance statistics - FIXED VERSION"""
        try:
            if not date_str:
                date_str = datetime.now().strftime('%Y-%m-%d')
            
            total_employees = self.employees.count_documents({})
            
            # ✅ FIX: Query berdasarkan struktur baru (date field)
            today_attendance = self.attendance.count_documents({
                'date': date_str,
                'checkin': {'$exists': True}  # Has check-in record
            })
            
            # Calculate attendance rate
            attendance_rate = (today_attendance / total_employees * 100) if total_employees > 0 else 0
            
            # Count late arrivals
            late_count = self.attendance.count_documents({
                'date': date_str,
                'checkin.status': 'late'
            })
            
            # Calculate average working duration for today
            pipeline = [
                {'$match': {
                    'date': date_str,
                    'work_duration_minutes': {'$exists': True, '$gt': 0}
                }},
                {'$group': {
                    '_id': None,
                    'avg_duration': {'$avg': '$work_duration_minutes'}
                }}
            ]
            
            avg_result = list(self.attendance.aggregate(pipeline))
            avg_duration = avg_result[0]['avg_duration'] if avg_result else 0
            
            stats = {
                'total_employees': total_employees,
                'present_today': today_attendance,
                'attendance_rate': round(attendance_rate, 2),
                'late_arrivals': late_count,
                'avg_working_hours': round(avg_duration / 60, 1) if avg_duration > 0 else 0,
                'date': date_str
            }
            
            print(f"✅ Stats for {date_str}: {stats}")
            return stats
            
        except Exception as e:
            print(f"❌ Error getting attendance stats: {e}")
            traceback.print_exc()
            return {
                'total_employees': 0,
                'present_today': 0,
                'attendance_rate': 0,
                'late_arrivals': 0,
                'avg_working_hours': 0,
                'date': date_str or datetime.now().strftime('%Y-%m-%d')
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
    
        # ==================== PENDING ATTENDANCE MANAGEMENT SYSTEM ====================
    
    def add_pending_attendance(self, employee_name, photo_data=None, additional_data=None):
        """Add attendance record to pending collection untuk approval manual"""
        try:
            # Cari employee berdasarkan nama
            employee = self.employees.find_one({'name': employee_name})
            
            if not employee:
                return {
                    'success': False, 
                    'error': f'Employee "{employee_name}" not found in database'
                }
            
            pending_record = {
                'employee_id': employee.get('employee_id'),
                'employee_name': employee_name,
                'department': employee.get('department', 'General'),
                'photo': photo_data,  # Simpan foto sebagai binary data atau path
                'timestamp': datetime.now(),
                'date': datetime.now().strftime('%Y-%m-%d'),
                'status': 'pending',  # pending, approved, rejected
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'additional_data': additional_data or {}  # Data tambahan jika ada
            }
            
            result = self.pending_attendance.insert_one(pending_record)
            
            if result.inserted_id:
                print(f"✅ Pending attendance added for {employee_name} (ID: {result.inserted_id})")
                return {
                    'success': True,
                    'message': 'Attendance submitted for approval',
                    'pending_id': str(result.inserted_id),
                    'employee_name': employee_name
                }
            else:
                return {'success': False, 'error': 'Failed to create pending attendance'}
                
        except Exception as e:
            print(f"❌ Error adding pending attendance: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_pending_attendance(self, status='pending', limit=50):
        """Get pending attendance records dengan filter status"""
        try:
            query = {'status': status} if status != 'all' else {}
            
            records = list(
                self.pending_attendance.find(query)
                .sort('created_at', -1)
                .limit(limit)
            )
            
            formatted_records = []
            for record in records:
                formatted_record = {
                    '_id': str(record['_id']),
                    'employee_id': record.get('employee_id'),
                    'employee_name': record.get('employee_name'),
                    'department': record.get('department'),
                    'timestamp': record.get('timestamp').isoformat() if record.get('timestamp') else None,
                    'date': record.get('date'),
                    'status': record.get('status'),
                    'created_at': record.get('created_at').isoformat() if record.get('created_at') else None,
                    'updated_at': record.get('updated_at').isoformat() if record.get('updated_at') else None,
                    'photo_exists': bool(record.get('photo')),  # Indikator apakah ada foto
                    'additional_data': record.get('additional_data', {})
                }
                formatted_records.append(formatted_record)
            
            print(f"✅ Found {len(formatted_records)} pending attendance records (status: {status})")
            return formatted_records
            
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
            
            if pending_record.get('status') != 'pending':
                return {'success': False, 'error': 'Attendance record already processed'}
            
            employee_id = pending_record.get('employee_id')
            employee_name = pending_record.get('employee_name')
            
            # Record attendance menggunakan fungsi yang sudah ada
            result = self.record_attendance_auto(employee_id)
            
            if result and result.get('success'):
                # Update status pending record menjadi approved
                self.pending_attendance.update_one(
                    {'_id': ObjectId(pending_id)},
                    {
                        '$set': {
                            'status': 'approved',
                            'approved_at': datetime.now(),
                            'attendance_id': result.get('data', {}).get('_id'),
                            'updated_at': datetime.now()
                        }
                    }
                )
                
                print(f"✅ Pending attendance approved: {employee_name}")
                return {
                    'success': True,
                    'message': 'Attendance approved successfully',
                    'employee_name': employee_name,
                    'action': result.get('action'),
                    'attendance_id': result.get('data', {}).get('_id')
                }
            else:
                return {'success': False, 'error': 'Failed to record attendance'}
            
        except Exception as e:
            print(f"❌ Error approving pending attendance: {e}")
            traceback.print_exc()
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
                        'rejection_reason': reason or 'No reason provided',
                        'updated_at': datetime.now()
                    }
                }
            )
            
            if result.modified_count > 0:
                # Dapatkan info employee untuk logging
                pending_record = self.pending_attendance.find_one({'_id': ObjectId(pending_id)})
                employee_name = pending_record.get('employee_name', 'Unknown')
                
                print(f"✅ Pending attendance rejected: {employee_name}")
                return {
                    'success': True, 
                    'message': 'Attendance rejected successfully',
                    'employee_name': employee_name
                }
            else:
                return {'success': False, 'error': 'Pending attendance not found'}
                
        except Exception as e:
            print(f"❌ Error rejecting pending attendance: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}
    
    def get_pending_stats(self):
        """Get statistics untuk pending attendance"""
        try:
            total_pending = self.pending_attendance.count_documents({'status': 'pending'})
            total_approved = self.pending_attendance.count_documents({'status': 'approved'})
            total_rejected = self.pending_attendance.count_documents({'status': 'rejected'})
            
            # Pending today
            start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            pending_today = self.pending_attendance.count_documents({
                'status': 'pending',
                'created_at': {'$gte': start_of_day}
            })
            
            return {
                'total_pending': total_pending,
                'total_approved': total_approved,
                'total_rejected': total_rejected,
                'pending_today': pending_today
            }
            
        except Exception as e:
            print(f"❌ Error getting pending stats: {e}")
            return {
                'total_pending': 0,
                'total_approved': 0,
                'total_rejected': 0,
                'pending_today': 0
            }

# Global instance
db = MongoDBManager()