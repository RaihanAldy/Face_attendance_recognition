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
                # Check-in <= startTime = ontime
                # Check-in > startTime = late
                if current_time <= start_time:
                    return 'ontime'
                else:
                    return 'late'
            
            elif action == 'check_out':
                # Check-out < endTime = early
                # Check-out >= endTime = ontime
                if current_time < end_time:
                    return 'early'
                else:
                    return 'ontime'
            
            return 'ontime'
            
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
        """Record attendance dengan auto-detect check-in/check-out - FIXED VERSION"""
        try:
            # Tentukan action otomatis
            attendance_type = self.determine_attendance_action(employee_id)
            
            print(f"🎯 Auto-detected action for {employee_id}: {attendance_type}")

            # Validasi employee exists
            employee = self.employees.find_one({'employee_id': employee_id})
            if not employee:
                return {
                    'success': False, 
                    'error': f'Employee {employee_id} not found'
                }

            timestamp = datetime.now()
            
            # Calculate status based on time
            status = self.calculate_attendance_status(timestamp, attendance_type)
            
            # Prepare attendance record
            attendance_record = {
                'employee_id': employee_id,
                'employees': employee.get('name', 'Unknown'),
                'department': employee.get('department', 'General'),
                'action': attendance_type,
                'status': status,
                'timestamp': timestamp,
                'date': timestamp.strftime('%Y-%m-%d'),
                'day_of_week': timestamp.strftime('%A'),
                'confidence': float(confidence),
                'last_updated': timestamp
            }

            # Calculate lateness for check-in
            if attendance_type == 'check_in':
                schedule = self.get_work_schedule()
                if schedule:
                    start_time_str = schedule['start_time']
                    start_hour, start_min = map(int, start_time_str.split(':'))
                    start_time = time(start_hour, start_min)
                    
                    if timestamp.time() > start_time:
                        time_diff = datetime.combine(timestamp.date(), start_time) - timestamp
                        attendance_record['lateness_minutes'] = abs(int(time_diff.total_seconds() / 60))

            # Insert record
            result = self.attendance.insert_one(attendance_record)
            
            if result.inserted_id:
                print(f"✅ Attendance recorded: {employee_id} - {attendance_type} - {status}")
                
                return {
                    'success': True,
                    'action': attendance_type,
                    'status': status,
                    'punctuality': status,
                    'timestamp': timestamp.isoformat(),
                    'employee': {
                        'employee_id': employee_id,
                        'name': employee.get('name'),
                        'department': employee.get('department')
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to insert attendance record'
                }
                
        except Exception as e:
            print(f"❌ Error in auto attendance recording: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
        
    def get_all_attendance(self):
        """Get semua attendance records tanpa filter"""
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
            
            print(f"🎯 Successfully formatted {len(formatted_results)} records")
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error getting all attendance: {e}")
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
            print(f"❌ Error updating work duration: {e}")

    # ==================== ATTENDANCE QUERIES ====================
    
    def get_attendance_by_date(self, date_str=None):
        """Get attendance logs by date - dengan improvement"""
        try:
            if date_str == 'all':
                # 🔥 PAKAI METHOD BARU untuk get all
                return self.get_all_attendance()
            elif date_str:
                query = {'date': date_str}
            else:
                date_str = datetime.now().strftime('%Y-%m-%d')
                query = {'date': date_str}
            
            print(f"🔍 Querying attendance for date: {date_str}")
            results = list(self.attendance.find(query).sort('timestamp', -1))
            
            print(f"✅ Found {len(results)} records for date {date_str}")
            
            formatted_results = []
            for record in results:
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