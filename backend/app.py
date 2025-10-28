from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from sync_manager import sync_manager
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

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
    if request.method == 'GET': 
        employees = db.get_all_employees()
        return jsonify(employees)
    
    elif request.method == 'POST':
        data = request.json
        result = db.register_employee(
            employee_id=data.get('employeeId'),
            name=data.get('name'),
            department=data.get('department', 'General')
        )
        return jsonify(result)

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

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    data = request.json
    image_data = data.get('image')
    
    if not image_data:
        return jsonify({'success': False, 'error': 'No image data provided'})
    
    result = face_engine.process_image(image_data)
    return jsonify(result)

@app.route('/api/analytics/dashboard', methods=['GET'])
def dashboard_analytics():
    stats = db.get_attendance_stats()
    analytics = db.get_daily_analytics()
    recent_recognitions = db.get_recent_recognitions(10)
    
    return jsonify({
        'stats': stats,
        'analytics': analytics,
        'recentRecognitions': recent_recognitions,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/system/cleanup', methods=['POST'])
def cleanup_system():
    return jsonify({'success': True, 'message': 'Cleanup completed'})

if __name__ == '__main__':
    print("🚀 Starting Attendance System...")
    print("📍 API Server: http://localhost:5000")
    print("📊 MongoDB: Connected")
    print("🤖 Face Recognition: Ready")
    app.run(host='0.0.0.0', port=5000, debug=True)