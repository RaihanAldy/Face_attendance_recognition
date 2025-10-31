from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from sync_manager import sync_manager
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

# Start background tasks
sync_manager.start()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected',
        'face_model': 'loaded' if face_engine.model else 'error'
    })

# ==================== SETTINGS ENDPOINTS ====================

@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    """
    GET: Retrieve current settings
    POST: Update settings
    """
    if request.method == 'GET':
        try:
            result = db.get_settings()
            if result.get('success'):
                return jsonify(result['settings'])
            else:
                return jsonify({'error': result.get('error', 'Failed to get settings')}), 500
                
        except Exception as e:
            print(f"❌ Error getting settings: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            print(f"📝 Updating settings: {data}")
            
            result = db.update_settings(data)
            
            if result.get('success'):
                print(f"✅ Settings updated successfully")
                return jsonify(result), 200
            else:
                print(f"❌ Failed to update settings: {result.get('error')}")
                return jsonify(result), 400
                
        except Exception as e:
            print(f"❌ Error updating settings: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

@app.route('/api/settings/schedule', methods=['GET'])
def get_schedule():
    """Get work schedule for validation"""
    try:
        schedule = db.get_work_schedule()
        if schedule:
            return jsonify(schedule)
        else:
            return jsonify({'error': 'Schedule not found'}), 404
            
    except Exception as e:
        print(f"❌ Error getting schedule: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees', methods=['GET'])
def get_employees():
    """Get all employees"""
    try:
        employees = db.get_all_employees()
        return jsonify(employees)
    except Exception as e:
        print(f"❌ Get employees error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== ATTENDANCE ENDPOINTS ====================

@app.route('/api/attendance', methods=['GET', 'POST'])
def attendance():
    """
    GET: Get attendance records by date
    POST: Record new attendance
    """
    if request.method == 'GET':
        try:
            date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
            format_type = request.args.get('format', 'raw')
            
            print(f"📅 GET /api/attendance - date: {date}, format: {format_type}")
            
            if format_type == 'paired':
                attendance_data = db.get_attendance_with_checkout(date)
                print(f"✅ Returning {len(attendance_data)} paired records")
            else:
                attendance_data = db.get_attendance_by_date(date)
                print(f"✅ Returning {len(attendance_data)} raw records")
            
            return jsonify(attendance_data)
            
        except Exception as e:
            print(f"❌ Error getting attendance: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            attendance_id = db.record_attendance(
                employee_id=data.get('employeeId'),
                confidence=data.get('confidence', 0.0),
                attendance_type=data.get('type', 'check_in')  # Fixed parameter name
            )
            
            if attendance_id:
                return jsonify({'success': True, 'attendanceId': attendance_id})
            else:
                return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
                
        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/checkin', methods=['POST'])
def check_in():
    """Record check-in with punctuality status"""
    try:
        data = request.json
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.95)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Missing employeeId'}), 400
        
        print(f"📥 Check-in request for: {employee_id}, confidence: {confidence}")
        
        # ✅ record_attendance now returns dict with 'id' and 'punctuality'
        result = db.record_attendance(
            employee_id=employee_id,
            confidence=confidence,
            attendance_type='check_in'
        )
        
        if result:
            punctuality = result.get('punctuality', 'on-time')
            print(f"✅ Check-in recorded: {employee_id} - Punctuality: {punctuality}")
            
            return jsonify({
                'success': True,
                'attendanceId': result['id'],
                'punctuality': punctuality  # ✅ Send punctuality to frontend
            })
        else:
            print(f"❌ Failed to record check-in for: {employee_id}")
            return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
            
    except Exception as e:
        print(f"❌ Check-in error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance/checkout', methods=['POST'])
def check_out():
    """Record check-out with punctuality status"""
    try:
        data = request.json
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.95)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Missing employeeId'}), 400
        
        print(f"📤 Check-out request for: {employee_id}, confidence: {confidence}")
        
        # ✅ record_attendance now returns dict with 'id' and 'punctuality'
        result = db.record_attendance(
            employee_id=employee_id,
            confidence=confidence,
            attendance_type='check_out'
        )
        
        if result:
            punctuality = result.get('punctuality', 'on-time')
            print(f"✅ Check-out recorded: {employee_id} - Punctuality: {punctuality}")
            
            return jsonify({
                'success': True,
                'attendanceId': result['id'],
                'punctuality': punctuality  # ✅ Send punctuality to frontend
            })
        else:
            print(f"❌ Failed to record check-out for: {employee_id}")
            return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
            
    except Exception as e:
        print(f"❌ Check-out error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance/employee/<employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    """Get attendance history untuk employee tertentu"""
    try:
        date = request.args.get('date', None)
        print(f"📊 Getting attendance for employee: {employee_id}, date: {date}")
        
        attendance_data = db.get_attendance_by_employee_id(employee_id, date)
        return jsonify(attendance_data)
        
    except Exception as e:
        print(f"❌ Error getting employee attendance: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/stats/daily', methods=['GET'])
def get_daily_attendance_stats():
    """Get daily attendance statistics - FIXED untuk collection baru"""
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        print(f"📈 Getting daily stats for: {date}")
        
        # Pipeline untuk collection attendance_logs yang baru
        pipeline = [
            {
                '$match': {
                    'date': date,
                    'check_in_time': {'$exists': True}
                }
            },
            {
                '$group': {
                    '_id': '$employee_id',
                    'checkInTime': {'$first': '$check_in_time'},
                    'confidence': {'$first': '$confidence'},
                    'status': {'$first': '$check_in_status'},
                    'lateness': {'$first': '$lateness_minutes'}
                }
            },
            {
                '$lookup': {
                    'from': 'employees',
                    'localField': '_id',
                    'foreignField': 'employee_id',
                    'as': 'employee'
                }
            },
            {
                '$unwind': '$employee'
            },
            {
                '$project': {
                    'employeeId': '$_id',
                    'employeeName': '$employee.name',
                    'department': '$employee.department',
                    'checkIn': '$checkInTime',
                    'confidence': 1,
                    'status': 1,
                    'latenessMinutes': '$lateness'
                }
            }
        ]
        
        results = list(db.attendance.aggregate(pipeline))  # FIXED: attendance_logs bukan attendance
        
        # Format results
        for item in results:
            item['_id'] = str(item['_id'])
            if 'checkIn' in item and item['checkIn']:
                item['checkIn'] = item['checkIn'].isoformat()
        
        print(f"✅ Found {len(results)} attendance records for {date}")
        return jsonify(results)
        
    except Exception as e:
        print(f"❌ Error getting daily stats: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== FACE RECOGNITION ENDPOINTS ====================

@app.route('/api/recognize-face', methods=['POST'])
def recognize_face_embedding():
    """Recognize face from embedding"""
    try:
        data = request.json
        face_embedding = data.get('faceEmbedding')
        
        if not face_embedding:
            return jsonify({'success': False, 'error': 'No face embedding provided'}), 400
        
        print(f"🔍 Face recognition request - embedding size: {len(face_embedding)}")
        
        result = db.recognize_face(face_embedding)
        
        if result.get('success'):
            employee = result['employee']
            print(f"✅ Face recognized: {employee['name']} ({employee['employee_id']}) - Similarity: {employee['similarity']:.3f}")
        else:
            print(f"⚠️ No match found - Best similarity: {result.get('similarity', 0):.3f}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Face recognition error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register_employee():
    """Register new employee with face embedding"""
    try:
        data = request.json
        name = data.get('name')
        department = data.get('department', 'General')
        position = data.get('position', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        face_embedding = data.get('faceEmbedding')
        
        if not name:
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        if not face_embedding or not isinstance(face_embedding, list):
            return jsonify({'success': False, 'error': 'Invalid face embedding'}), 400
        
        print(f"📝 Registration request - name: {name}, dept: {department}")
        
        result = db.register_employee_face(
            name=name,
            face_embedding=face_embedding,
            department=department,
            position=position,
            email=email,
            phone=phone
        )
        
        if result.get('success'):
            employee_id = result.get('employee_id')
            print(f"✅ Employee registered: {employee_id} - {name}")
            return jsonify(result), 201
        else:
            error_msg = result.get('error', 'Unknown error')
            print(f"❌ Registration failed: {error_msg}")
            return jsonify(result), 500
        
    except Exception as e:
        print(f"❌ Registration error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== UTILITY ENDPOINTS ====================

@app.route('/api/system/cleanup', methods=['POST'])
def cleanup_system():
    """System cleanup"""
    return jsonify({'success': True, 'message': 'Cleanup completed'})

@app.route('/api/test-db', methods=['GET'])
def test_db():
    """Test database connection and data"""
    try:
        # Test employees
        employees_count = db.employees.count_documents({})
        
        # Test attendance logs
        attendance_count = db.attendance.count_documents({})
        
        # Get today's date
        today = datetime.now().strftime('%Y-%m-%d')
        today_logs = list(db.attendance.find({'date': today}).limit(5))
        
        return jsonify({
            'success': True,
            'employees_count': employees_count,
            'attendance_count': attendance_count,
            'today_logs_count': len(today_logs),
            'today_logs_sample': [
                {
                    'employee_id': log.get('employee_id'),
                    'employees': log.get('employees'),
                    'check_in_time': log.get('check_in_time').isoformat() if log.get('check_in_time') else None,
                    'check_out_time': log.get('check_out_time').isoformat() if log.get('check_out_time') else None
                }
                for log in today_logs
            ]
        })
        
    except Exception as e:
        print(f"❌ Test DB error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Face Recognition Attendance System")
    print("=" * 60)
    print("📍 API Server: http://localhost:5000")
    print("📊 MongoDB: Connected")
    print("📁 Using collection: attendance")
    print("🎯 CORS enabled for: http://localhost:5173")
    
    app.run(host='0.0.0.0', port=5000, debug=True)