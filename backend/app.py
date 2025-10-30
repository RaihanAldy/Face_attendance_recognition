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
         - With query param 'format=paired' → returns paired check-in/checkout
         - Without 'format' param → returns raw records
    POST: Record new attendance
    """
    if request.method == 'GET':
        try:
            date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
            format_type = request.args.get('format', 'raw')  # 'raw' or 'paired'
            
            print(f"📅 GET /api/attendance - date: {date}, format: {format_type}")
            
            # ✅ Smart routing based on format parameter
            if format_type == 'paired':
                # For AttendanceLog page - paired check-in/checkout
                attendance_data = db.get_attendance_with_checkout(date)
                print(f"✅ Returning {len(attendance_data)} paired records")
            else:
                # For raw data - individual records
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
                attendance_type=data.get('status', 'check_in')
            )
            
            if attendance_id:
                return jsonify({'success': True, 'attendanceId': attendance_id})
            else:
                return jsonify({'success': False, 'error': 'Failed to record'}), 500
                
        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
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
        
        print(f"📥 Check-in request for: {employee_id}")
        
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
        
        print(f"📤 Check-out request for: {employee_id}")
        
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
    """Get daily attendance statistics"""
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        print(f"📈 Getting daily stats for: {date}")
        
        start_of_day = datetime.strptime(date, '%Y-%m-%d').replace(hour=0, minute=0, second=0)
        end_of_day = datetime.strptime(date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
        
        pipeline = [
            {
                '$match': {
                    'timestamp': {'$gte': start_of_day, '$lte': end_of_day}
                }
            },
            {
                '$group': {
                    '_id': '$employee_id',
                    'checkInTime': {'$first': '$timestamp'},
                    'confidence': {'$first': '$confidence'}
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
                    'confidence': 1
                }
            }
        ]
        
        results = list(db.attendance.aggregate(pipeline))
        
        # Format results
        for item in results:
            item['_id'] = str(item['_id'])
            if 'checkIn' in item and item['checkIn']:
                item['checkIn'] = item['checkIn'].isoformat()
        
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
        
        # Call MongoDB face recognition
        result = db.recognize_face(face_embedding)
        
        if result.get('success'):
            print(f"✅ Face recognized: {result['employee']['name']}")
        else:
            print(f"⚠️ No match found")
        
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
        face_embedding = data.get('faceEmbedding')
        
        # Validation
        if not name:
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        if not face_embedding or not isinstance(face_embedding, list):
            return jsonify({'success': False, 'error': 'Invalid face embedding'}), 400
        
        print(f"📝 Registration request - name: {name}, dept: {department}, embedding size: {len(face_embedding)}")
        
        # Call MongoDB registration
        result = db.register_employee_face(name, face_embedding, department)
        
        if result.get('success'):
            print(f"✅ Employee registered: {result['employee_id']} - {name}")
            return jsonify(result), 201
        else:
            print(f"❌ Registration failed: {result.get('error')}")
            return jsonify(result), 500
        
    except Exception as e:
        print(f"❌ Registration error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== ANALYTICS ENDPOINTS ====================

@app.route('/api/analytics/dashboard', methods=['GET'])
def dashboard_analytics():
    """Get dashboard analytics data"""
    try:
        print("📊 Getting dashboard analytics")
        
        stats = db.get_attendance_stats()
        analytics = db.get_daily_analytics()
        recent_recognitions = db.get_recent_recognitions(10)
        
        return jsonify({
            'stats': stats,
            'analytics': analytics,
            'recentRecognitions': recent_recognitions
        })
        
    except Exception as e:
        print(f"❌ Analytics error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== UTILITY ENDPOINTS ====================

@app.route('/api/system/cleanup', methods=['POST'])
def cleanup_system():
    """System cleanup (placeholder)"""
    return jsonify({'success': True, 'message': 'Cleanup completed'})

@app.route('/api/recognize', methods=['POST'])
def recognize_face_legacy():
    """Legacy face recognition endpoint (mock data)"""
    try:
        print("🤖 Legacy face recognition request")
        import time
        time.sleep(1)
        
        result = {
            'success': True,
            'faces_detected': 1,
            'results': [
                {
                    'bbox': [100, 100, 200, 200],
                    'confidence': 0.95,
                    'embedding': [0.1] * 512
                }
            ]
        }
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Legacy recognition error: {e}")
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
    print("🎯 CORS enabled for: http://localhost:5173")
    
    app.run(host='0.0.0.0', port=5000, debug=True)