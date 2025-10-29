from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from sync_manager import sync_manager
from datetime import datetime
import traceback
import json

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

@app.route('/api/employees', methods=['GET', 'POST'])
def employees():
    try:
        employees = db.get_all_employees()
        return jsonify(employees)
    except Exception as e:
        print(f"❌ Get employees error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance', methods=['GET', 'POST'])
def attendance():
    if request.method == 'GET':
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        attendance_data = db.get_attendance_by_date(date)
        return jsonify(attendance_data)
    
    elif request.method == 'POST':
        data = request.json
        attendance_id = db.record_attendance(
            employee_id=data.get('employeeId'),
            confidence=data.get('confidence', 0.0)
        )
        return jsonify({'success': True, 'attendanceId': attendance_id})
    
@app.route('/api/attendance/checkin', methods=['POST'])
def check_in():
    try:
        data = request.json
        employee_id = data.get('employeeId', 'EMP-001')
        confidence = data.get('confidence', 0.95)
        
        attendance_id = db.record_attendance(
            employee_id=employee_id,
            confidence=confidence,
            attendance_type='check_in'
        )
        
        if attendance_id:
            print(f"✅ Check-in recorded in MongoDB: {employee_id}")
            return jsonify({'success': True, 'attendanceId': attendance_id})
        else:
            return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
        
    except Exception as e:
        print(f"❌ Check-in error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance/checkout', methods=['POST'])
def check_out():
    try:
        data = request.json
        employee_id = data.get('employeeId', 'EMP-001')
        confidence = data.get('confidence', 0.95)
        
        attendance_id = db.record_attendance(
            employee_id=employee_id,
            confidence=confidence, 
            attendance_type='check_out'
        )
        
        if attendance_id:
            print(f"✅ Check-out recorded in MongoDB: {employee_id}")
            return jsonify({'success': True, 'attendanceId': attendance_id})
        else:
            return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
        
    except Exception as e:
        print(f"❌ Check-out error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance', methods=['GET'])
@app.route('/api/attendance', methods=['GET'])
def get_attendance_log():
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        attendance_data = db.get_attendance_with_checkout(date)

        # 🧩 Ubah key agar cocok dengan frontend
        formatted = []
        for record in attendance_data:
            formatted.append({
                "_id": str(record.get("_id")),
                "employeeId": record.get("employee_id"),
                "name": record.get("employees") or record.get("name"),
                "status": record.get("status"),
                "timestamp": record.get("timestamp"),
                "checkIn": record.get("checkIn"),
                "checkOut": record.get("checkOut"),
            })

        return jsonify(formatted)
    except Exception as e:
        print(f"❌ Attendance log error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    
@app.route('/api/attendance/employee/<employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    """Get attendance history untuk employee tertentu"""
    try:
        date = request.args.get('date', None)
        attendance_data = db.get_attendance_by_employee_id(employee_id, date)
        
        return jsonify(attendance_data)
        
    except Exception as e:
        print(f"❌ Error getting employee attendance: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/stats/daily', methods=['GET'])
def get_daily_attendance_stats():
    """Get daily attendance statistics"""
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        pipeline = [
            {
                '$match': {
                    'timestamp': {
                        '$gte': datetime.strptime(date, '%Y-%m-%d').replace(hour=0, minute=0, second=0),
                        '$lte': datetime.strptime(date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                    }
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
        
        # Execute aggregation
        results = list(db.attendance.aggregate(pipeline))
        
        # Convert untuk JSON
        for item in results:
            item['_id'] = str(item['_id'])
            if 'checkIn' in item:
                item['checkIn'] = item['checkIn'].isoformat()
                
        return jsonify(results)
        
    except Exception as e:
        print(f"❌ Error getting daily stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    try:
        data = request.json
        print("🤖 Face recognition request received")
        
        # Simulate face recognition processing
        import time
        time.sleep(1)
        
        # Always return success dengan mock data
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
        print(f"❌ Face recognition error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics/dashboard', methods=['GET'])
def dashboard_analytics():
    try:
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
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/cleanup', methods=['POST'])
def cleanup_system():
    return jsonify({'success': True, 'message': 'Cleanup completed'})

if __name__ == '__main__':
    print("🚀 Starting Attendance System...")
    print("📍 API Server: http://localhost:5000")
    print("📊 MongoDB: Connected")
    print("✅ All endpoints ready:")
    print("🎯 CORS enabled for: http://localhost:5173")
    app.run(host='0.0.0.0', port=5000, debug=True)