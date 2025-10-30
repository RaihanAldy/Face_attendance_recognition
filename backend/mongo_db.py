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
        self.client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
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
                    'syncFrequency': 15,
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
            required_fields = ['startTime', 'endTime', 'syncFrequency']
            for field in required_fields:
                if field not in settings_data:
                    return {'success': False, 'error': f'Missing required field: {field}'}
            
            start_time = settings_data['startTime']
            end_time = settings_data['endTime']
            
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
        """Create necessary indexes"""
        self.employees.create_index('employee_id', unique=True)
        self.attendance.create_index('employee_id')
        self.attendance.create_index('timestamp')
        self.attendance.create_index([('timestamp', -1)])
        self.attendance.create_index('employees')
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
    
    def register_employee_face(self, name, face_embedding, department='General', position='', email='', phone=''):
        """Register new employee dengan face embedding dan auto-generated ID"""
        try:
            employee_id = self.get_next_employee_id()
            
            # Validasi email jika provided
            if email and not self.is_valid_email(email):
                return {
                    'success': False,
                    'error': 'Format email tidak valid'
                }
            
            # Validasi phone jika provided
            if phone and not self.is_valid_phone(phone):
                return {
                    'success': False,
                    'error': 'Format nomor telepon tidak valid'
                }
            
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
                print(f"📋 Details: {position} | {department} | {email} | {phone}")
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

    def is_valid_email(self, email):
        """Validasi format email sederhana"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    def is_valid_phone(self, phone):
        """Validasi format nomor telepon (menerima berbagai format)"""
        import re
        # Menerima format: +62, 62, 08, dengan atau tanpa spasi/dash
        pattern = r'^(\+62|62|0)8[1-9][0-9]{6,9}$'
        # Hapus spasi dan dash untuk validasi
        clean_phone = re.sub(r'[\s-]', '', phone)
        return re.match(pattern, clean_phone) is not None
    
    def get_all_employees(self):
        """Get all employees dengan data lengkap"""
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
                        'position': employee.get('position', ''),
                        'email': employee.get('email', ''),
                        'phone': employee.get('phone', ''),
                        'created_at': employee['created_at'].isoformat() if 'created_at' in employee else None,
                        'last_updated': employee['last_updated'].isoformat() if 'last_updated' in employee else None
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
<<<<<<< HEAD
            # Ambil semua employee (tanpa filter is_active)
=======
>>>>>>> hans
            employees = list(self.employees.find())
            
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
    
<<<<<<< HEAD
    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in', action=None):
        """
        Record attendance dengan type (check_in/check_out)
        Compatible dengan struktur frontend
        """
=======
    def record_attendance(self, employee_id, confidence=0.0, attendance_type='check_in'):
    
>>>>>>> hans
        try:
        # 🧩 Ambil data karyawan
            existing_employee = self.employees.find_one({'employee_id': employee_id})
            if not existing_employee:
                print(f"❌ Employee with ID {employee_id} not found")
                return None
<<<<<<< HEAD
            
            # Tentukan status berdasarkan waktu untuk frontend
            current_time = datetime.now()
            hour = current_time.hour
            
            # Logic untuk menentukan status (ontime, late, early)
            if attendance_type == 'check_in':
                if hour < 9:
                    status = 'ontime'
                elif hour < 10:
                    status = 'late'
                else:
                    status = 'late'
            else:  # check_out
                if hour > 17:
                    status = 'ontime'
                elif hour > 16:
                    status = 'early'
                else:
                    status = 'early'
            
            attendance_data = {
                'employee_id': employee_id,
                'employees': existing_employee['name'],  # Field 'employees' berisi nama
                'action': action or attendance_type,  # 'check_in' atau 'check_out'
                'status': status,  # 'ontime', 'late', 'early'
                'timestamp': current_time,
=======

            current_timestamp = datetime.now()
            schedule = self.get_work_schedule()
            status = self.calculate_attendance_status(current_timestamp, attendance_type)

            # 🗓️ Tambahan field analitik
            date_str = current_timestamp.strftime('%Y-%m-%d')
            day_of_week = calendar.day_name[current_timestamp.weekday()]
            department = existing_employee.get('department', 'General')

            # 🕒 Hitung keterlambatan dan durasi kerja (sementara)
            lateness_minutes = 0
            work_duration = 0

            # Hitung keterlambatan hanya untuk check-in
            if attendance_type == 'check_in' and schedule:
                start_hour, start_min = map(int, schedule['start_time'].split(':'))
                start_time_today = current_timestamp.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
                if current_timestamp > start_time_today:
                    lateness_minutes = int((current_timestamp - start_time_today).total_seconds() // 60)

            # Hitung durasi kerja jika ini check-out
            if attendance_type == 'check_out':
                today_records = list(self.attendance.find({
                    'employee_id': employee_id,
                    'date': date_str,
                    'action': 'check_in'
                }).sort('timestamp', 1))

                if today_records:
                    check_in_time = today_records[0]['timestamp']
                    work_duration = int((current_timestamp - check_in_time).total_seconds() // 60)  # dalam menit

            # 📦 Buat data yang akan disimpan
            attendance_data = {
                'employee_id': employee_id,
                'employees': existing_employee['name'],
                'status': status,  # 'ontime', 'late', 'early'
                'action': attendance_type.replace('_', '-'),  # ubah jadi check-in/check-out
                'timestamp': current_timestamp,
                'date': date_str,
                'day_of_week': day_of_week,
                'department': department,
                'work_duration': work_duration,       # menit
                'lateness_minutes': lateness_minutes, # menit
>>>>>>> hans
                'confidence': float(confidence)
            }

            result = self.attendance.insert_one(attendance_data)
<<<<<<< HEAD
            print(f"✅ {attendance_type.upper()} recorded for {employee_id} ({existing_employee['name']}) - Status: {status}")
            return str(result.inserted_id)
            
=======

            # 🟢 Logging
            emoji = {'ontime': '✅', 'late': '⏰', 'early': '⚡'}.get(status, '📝')
            print(f"{emoji} {attendance_type.upper()} - {existing_employee['name']} ({department}) | "
                f"Status: {status.upper()} | Late: {lateness_minutes}m | Work: {work_duration}m")

            return {
                'success': True,
                'id': str(result.inserted_id),
                'status': status,
                'lateness_minutes': lateness_minutes,
                'work_duration': work_duration
            }

>>>>>>> hans
        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    # ==================== ATTENDANCE QUERIES ====================
    
<<<<<<< HEAD
=======
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
    
>>>>>>> hans
    def get_attendance_by_date(self, date_str=None):
        """Get raw attendance records by date"""
        try:
            if date_str == 'all':
                query = {}
            elif date_str:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
            else:
                date_obj = datetime.now()
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
            
            results = list(self.attendance.find(query).sort('timestamp', -1))
            
<<<<<<< HEAD
            # Format untuk frontend - SESUAI DENGAN TABLE UTILS
=======
>>>>>>> hans
            formatted_results = []
            for r in results:
                # Dapatkan nama employee yang konsisten
                employee_name = r.get('employees')
                if not employee_name:
                    # Fallback: cari dari collection employees
                    employee = self.employees.find_one({'employee_id': r.get('employee_id')})
                    employee_name = employee.get('name', 'Unknown') if employee else 'Unknown'
                
                formatted_record = {
                    '_id': str(r.get('_id')),
                    'employeeId': r.get('employee_id', 'N/A'),
<<<<<<< HEAD
                    'name': employee_name,
                    'employees': employee_name,
                    'action': r.get('action', 'check_in'),  # 'check_in' atau 'check_out'
                    'status': r.get('status', 'ontime'),    # 'ontime', 'late', 'early'
=======
                    'name': r.get('employees', 'Unknown'),
                    'employees': r.get('employees', 'Unknown'),
                    'action': r.get('action', 'check_in'),
                    'status': r.get('status', 'ontime'),
>>>>>>> hans
                    'timestamp': r.get('timestamp').isoformat() if r.get('timestamp') else None,
                    'confidence': float(r.get('confidence', 0)),
                    # Field tambahan untuk compatibility
                    'employee_id': r.get('employee_id', 'N/A'),
                    'employee_name': employee_name
                }
                
                formatted_results.append(formatted_record)
            
<<<<<<< HEAD
            print(f"✅ Formatted {len(formatted_results)} attendance records")
            
            # Debug: print sample data
            if formatted_results and len(formatted_results) > 0:
                print(f"📋 Sample record: {formatted_results[0]}")
            
=======
>>>>>>> hans
            return formatted_results

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

    def get_attendance_by_employee_id(self, employee_id, date_str=None):
        """Get attendance data untuk employee tertentu"""
        try:
            query = {'employee_id': employee_id}
            
            if date_str and date_str != 'all':
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                query['timestamp'] = {'$gte': start_of_day, '$lte': end_of_day}
            
            attendance_records = list(self.attendance.find(query).sort('timestamp', -1))
            
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
            
<<<<<<< HEAD
            # Hitung semua employee (tanpa filter is_active)
=======
>>>>>>> hans
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
<<<<<<< HEAD
                        '_id': 1,
=======
>>>>>>> hans
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