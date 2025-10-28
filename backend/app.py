from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import MongoDBManager
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # Enable CORS untuk React frontend
db = MongoDBManager()

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected'
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
            confidence=data.get('confidence', 0.0),
            status=data.get('status', 'present')
        )
        return jsonify({'success': True, 'attendanceId': attendance_id})

@app.route('/api/analytics/dashboard', methods=['GET'])
def dashboard_analytics():
    stats = db.get_attendance_stats()
    analytics = db.get_daily_analytics()
    
    return jsonify({
        'stats': stats,
        'analytics': analytics,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """Endpoint untuk face recognition dari React"""
    try:
        # Expect base64 image dari React
        data = request.json
        image_data = data.get('image')
        
        # Process image dengan face engine
        from face_engine import FaceEngine
        engine = FaceEngine()
        
        result = engine.process_image(image_data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync/status', methods=['GET'])
def sync_status():
    """Check sync status"""
    unsynced_data = db.get_unsynced_data()
    return jsonify({
        'unsyncedCount': unsynced_data['count'],
        'lastSync': db.get_last_sync_time(),
        'status': 'online'  # atau 'offline' berdasarkan kondisi
    })

if __name__ == '__main__':
    print("🚀 Starting Flask API Server...")
    print("📍 API: http://localhost:5000")
    print("🔗 CORS Enabled for React")
    app.run(host='0.0.0.0', port=5000, debug=True)