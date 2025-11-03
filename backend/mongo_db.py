from pymongo import MongoClient
from datetime import datetime, timedelta, time
import numpy as np
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
        self.settings = self.db.settings
        
        self._create_indexes()
        self._init_default_settings() 
    
    def _create_indexes(self):
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        self.attendance.create_index('date')
        self.attendance.create_index([('employee_id', 1), ('date', 1)])
        print("✅ Database indexes created")

    def _init_default_settings(self):
        """Initialize default settings jika belum ada"""
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
                print(f"   Work hours: {default_settings['startTime']} - {default_settings['endTime']}")
        except Exception as e:
            print(f"⚠️ Error initializing default settings: {e}")
    # ==================== ATTENDANCE STATUS CALCULATION ====================
    
    def calculate_attendance_status(self, timestamp, action):
        try:
            # Ambil settings dari database
            settings = self.settings.find_one({'_id': 'default'})
            if not settings:
                print("⚠️ Settings not found, using default 'ontime'")
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
            
            # ✅ FIX: Hitung threshold dengan benar
            # Untuk late threshold: tambahkan menit ke start_time
            late_minutes = start_min + late_threshold
            late_hour = start_hour + (late_minutes // 60)
            late_min = late_minutes % 60
            start_time_with_threshold = time(late_hour, late_min)
            
            # Untuk early threshold: kurangi menit dari end_time
            early_minutes = end_min - early_leave_threshold
            if early_minutes < 0:
                early_hour = end_hour - 1
                early_min = 60 + early_minutes
            else:
                early_hour = end_hour
                early_min = early_minutes
            end_time_with_threshold = time(early_hour, early_min)
            
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
                        'status': status,
                        'timestamp': timestamp.isoformat()
                    },
                    'checkout': None,  # ✅ TAMBAHKAN FIELD INI
                    'work_duration_minutes': 0,  # ✅ TAMBAHKAN FIELD INI
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
                    'status': status,
                    'employee_name': employee_name,
                    'data': record_data
                }

            elif attendance_type == 'check_out':
                # Update dokumen dengan data checkout
                update_fields = {
                    'checkout': {
                        'status': status,
                        'timestamp': timestamp.isoformat()
                    },
                    'updatedAt': timestamp
                }

                # Hitung durasi kerja jika checkin ada
                if existing_record and existing_record.get('checkin'):
                    checkin_time_str = existing_record['checkin']['timestamp']
                    # Handle both ISO format with/without timezone
                    if 'Z' in checkin_time_str:
                        checkin_time = datetime.fromisoformat(checkin_time_str.replace('Z', '+00:00'))
                    else:
                        checkin_time = datetime.fromisoformat(checkin_time_str)
                    
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
                    'status': status,
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
            print("📊 Fetching ALL attendance records...")
            
            # Ambil semua data dari collection attendance
            attendance_records = list(self.attendance.find().sort('timestamp', -1))
            
            print(f"✅ Found {len(attendance_records)} raw records in database")
            
            formatted_results = []
            for record in attendance_records:
                try:
                    formatted_record = {
                        '_id': str(record.get('_id')),
                        'employee_id': record.get('employee_id'),
                        'employees': record.get('employees'),
                        'department': record.get('department'),
                        'date': record.get('date'),
                        'day_of_week': record.get('day_of_week'),
                        'timestamp': record.get('timestamp').isoformat() if record.get('timestamp') else None,
                        'last_updated': record.get('last_updated').isoformat() if record.get('last_updated') else None,
                        'lateness_minutes': record.get('lateness_minutes', 0),
                        'confidence': record.get('confidence', 0),
                        'check_in_time': record.get('check_in_time').isoformat() if record.get('check_in_time') else None,
                        'check_in_status': record.get('check_in_status'),
                        'check_in_confidence': record.get('check_in_confidence', 0),
                        'status': record.get('status'),
                        'check_out_time': record.get('check_out_time').isoformat() if record.get('check_out_time') else None,
                        'check_out_status': record.get('check_out_status'),
                        'check_out_confidence': record.get('check_out_confidence', 0),
                        'work_duration': record.get('work_duration', 0)
                    }
                    formatted_results.append(formatted_record)
                    
                except Exception as e:
                    print(f"⚠️ Error formatting record {record.get('_id')}: {e}")
                    continue
            
            print(f"✅ Successfully formatted {len(formatted_results)} records")
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting attendance records: {e}")
            traceback.print_exc()
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
            traceback.print_exc()
            return []
        
    def get_settings(self):
        """Get current system settings"""
        try:
            settings = self.settings.find_one({'_id': 'default'})
            if settings:
                # Remove MongoDB _id dari response
                settings.pop('_id', None)
                
                # Convert datetime to ISO format
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
            required_fields = ['startTime', 'endTime', 'syncFrequency']
            for field in required_fields:
                if field not in settings_data:
                    return {'success': False, 'error': f'Missing required field: {field}'}
            
            start_time = settings_data['startTime']
            end_time = settings_data['endTime']
            
            # Validate time format
            if start_time >= end_time:
                return {'success': False, 'error': 'End time must be after start time'}
            
            sync_freq = int(settings_data['syncFrequency'])
            if sync_freq < 1:
                return {'success': False, 'error': 'Sync frequency must be at least 1 minute'}
            
            update_data = {
                'startTime': start_time,
                'endTime': end_time,
                'syncFrequency': sync_freq,
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
                print(f"   New work hours: {start_time} - {end_time}")
                return {'success': True, 'message': 'Settings updated successfully'}
            else:
                return {'success': False, 'error': 'No changes made'}
                
        except Exception as e:
            print(f"❌ Error updating settings: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def get_work_schedule(self):
        """
        Get work schedule untuk attendance validation
        
        Returns:
            dict: {
                'start_time': '08:00',
                'end_time': '17:00',
                'late_threshold': 15,
                'early_leave_threshold': 30
            }
        """
        try:
            settings = self.settings.find_one({'_id': 'default'})
            if settings:
                schedule = {
                    'start_time': settings.get('startTime', '08:00'),
                    'end_time': settings.get('endTime', '17:00'),
                    'late_threshold': settings.get('lateThreshold', 15),
                    'early_leave_threshold': settings.get('earlyLeaveThreshold', 30)
                }
                print(f"📅 Work schedule: {schedule['start_time']} - {schedule['end_time']}")
                return schedule
            else:
                # Return default jika settings tidak ada
                print("⚠️ Settings not found, using default schedule")
                return {
                    'start_time': '08:00',
                    'end_time': '17:00',
                    'late_threshold': 15,
                    'early_leave_threshold': 30
                }
        except Exception as e:
            print(f"❌ Error getting work schedule: {e}")
            traceback.print_exc()
            # Return default on error
            return {
                'start_time': '08:00',
                'end_time': '17:00',
                'late_threshold': 15,
                'early_leave_threshold': 30
            }
        
# Global instance
db = MongoDBManager()