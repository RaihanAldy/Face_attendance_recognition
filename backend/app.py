from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from datetime import datetime
import traceback
from sync_mongo_to_dynamo import main as sync_mongo_to_dynamo 
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])


# ================= Scheduler Setup =================
scheduler = BackgroundScheduler()

def scheduled_sync():
    print(f"⏰ Running scheduled sync at {datetime.now().isoformat()}")
    try:
        sync_mongo_to_dynamo.main()
    except Exception as e:
        print(f"❌ Error during scheduled sync: {e}")

# jalankan setiap hari jam 02:00 pagi (ubah sesuai kebutuhan)
scheduler.add_job(scheduled_sync, 'cron', hour=2, minute=0)
scheduler.start()

@app.route('/api/sync', methods=['POST'])
def manual_sync():
    try:
        sync_mongo_to_dynamo()  # fungsi sync Anda
        return jsonify({"message": "Sync berhasil dijalankan!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== HEALTH & ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected',
        'face_model': 'loaded' if getattr(face_engine, 'model', None) else 'error'
    })
 
@app.route('/api/routes', methods=['GET'])
def list_routes():
    """List all available API routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            routes.append({
                'endpoint': rule.endpoint,
                'methods': sorted(list(rule.methods - { 'HEAD', 'OPTIONS' })),
                'path': str(rule)
            })
    return jsonify({
        'total_routes': len(routes),
        'routes': sorted(routes, key=lambda x: x['path'])
    }), 200

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

# ==================== ATTENDANCE ENDPOINTS (NEW STRUCTURE) ====================

@app.route('/api/attendance', methods=['GET', 'POST'])
def attendance():
    """
    GET: Get attendance records by date
    POST: Record new attendance (auto-detected checkin/checkout)
    """
    if request.method == 'GET':
        try:
            date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
            
            print(f"📅 GET /api/attendance - date: {date}")
            
            attendance_data = db.get_attendance_by_date(date)
            
            print(f"✅ Returning {len(attendance_data)} attendance records")
            return jsonify(attendance_data)
            
        except Exception as e:
            print(f"❌ Error getting attendance: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json or {}
            employee_id = data.get('employeeId')
            confidence = data.get('confidence', 0.0)

            if not employee_id:
                return jsonify({'success': False, 'error': 'Employee ID is required'}), 400

            # Use auto recorder
            result = db.record_attendance_auto(employee_id, confidence)

            if result and result.get('success'):
                return jsonify(result), 200
            else:
                error_msg = result.get('error') if result else 'Failed to record attendance'
                return jsonify({'success': False, 'error': error_msg}), 500
                
        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/checkin', methods=['POST'])
def checkin():
    """Manual check-in endpoint (new structure)"""
    try:
        data = request.json or {}
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.95)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Missing employeeId'}), 400
        
        print(f"📥 Manual check-in for: {employee_id}")
        
        # Pakai format baru: insert/update dokumen hari ini
        result = db.record_attendance_auto(employee_id, confidence)
        return jsonify(result), 200 if result.get('success') else 500
            
    except Exception as e:
        print(f"❌ Check-in error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/attendance/checkout', methods=['POST'])
def checkout():
    """Manual check-out endpoint (new structure)"""
    try:
        data = request.json or {}
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.95)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Missing employeeId'}), 400
        
        print(f"📤 Manual check-out for: {employee_id}")
        
        # Format baru juga auto-handle checkout
        result = db.record_attendance_auto(employee_id, confidence)
        return jsonify(result), 200 if result.get('success') else 500
            
    except Exception as e:
        print(f"❌ Check-out error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
@app.route('/api/attendance/auto', methods=['POST'])
def record_attendance_auto():
    """Record attendance with auto-detect (recommended)"""
    try:
        data = request.json or {}
        print(f"🤖 AUTO ATTENDANCE - Data: {data}")
        
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.0)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Employee ID is required'}), 400
        
        result = db.record_attendance_auto(employee_id, confidence)
        
        if result and result.get('success'):
            return jsonify(result), 200
        else:
            error_msg = result.get('error') if result else 'Failed to record attendance'
            return jsonify({'success': False, 'error': error_msg}), 500
                
    except Exception as e:
        print(f"❌ Error recording auto attendance: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/employee/<employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    """Get attendance history for specific employee"""
    try:
        date = request.args.get('date', None)
        print(f"📊 Getting attendance for employee: {employee_id}, date: {date}")
        
        attendance_data = db.get_attendance_by_employee_id(employee_id, date)
        return jsonify(attendance_data)
        
    except Exception as e:
        print(f"❌ Error getting employee attendance: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/stats', methods=['GET'])
def get_attendance_stats():
    """Get attendance statistics"""
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        print(f"📈 Getting stats for: {date}")
        
        stats = db.get_attendance_stats(date)
        
        print(f"✅ Stats: {stats}")
        return jsonify(stats)
        
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== FACE RECOGNITION ENDPOINTS ====================

@app.route('/api/extract-face', methods=['POST'])
def extract_face():
    """Extract face embedding from image"""
    try:
        data = request.json or {}
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        print("🔍 Extracting face embedding from image...")
        
        result = face_engine.extract_face_embedding(image_data)
        
        if result.get('success'):
            print(f"✅ Face embedding extracted: {len(result['embedding'])} dimensions")
            print(f"   Detection confidence: {result['confidence']:.3f}")
            return jsonify(result)
        else:
            print(f"⚠️ Face extraction failed: {result.get('error')}")
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error extracting face: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/recognize-face', methods=['POST'])
def recognize_face_embedding():
    """Recognize face from image or embedding"""
    try:
        data = request.json or {}
        
        # Check if image or embedding provided
        if 'image' in data:
            print("📸 Image provided, extracting embedding...")
            extract_result = face_engine.extract_face_embedding(data['image'])
            
            if not extract_result.get('success'):
                return jsonify({
                    'success': False,
                    'error': extract_result.get('error', 'Failed to extract face'),
                    'face_detected': extract_result.get('face_detected', False)
                }), 400
            
            face_embedding = extract_result['embedding']
            extraction_confidence = extract_result['confidence']
            
        elif 'faceEmbedding' in data:
            face_embedding = data['faceEmbedding']
            extraction_confidence = 0.95
            
        else:
            return jsonify({
                'success': False,
                'error': 'No image or faceEmbedding provided'
            }), 400
        
        print(f"🔍 Face recognition request - embedding size: {len(face_embedding)}")
        
        # Recognize from database
        result = db.recognize_face(face_embedding, threshold=0.6)
        
        if result.get('success'):
            employee = result['employee']
            
            # Combine confidence
            final_confidence = (extraction_confidence * 0.3 + employee['similarity'] * 0.7)
            employee['confidence'] = final_confidence
            
            print(f"✅ Face recognized: {employee['name']} ({employee['employee_id']})")
            print(f"   Similarity: {employee['similarity']:.3f}")
            print(f"   Final confidence: {final_confidence:.3f}")
            
            return jsonify({
                'success': True,
                'employee': employee,
                'message': 'Face recognized successfully'
            })
        else:
            best_similarity = result.get('similarity', 0)
            print(f"⚠️ No match found - Best similarity: {best_similarity:.3f}")
            
            return jsonify({
                'success': False,
                'message': 'No matching employee found',
                'similarity': best_similarity,
                'threshold': 0.6
            }), 404
        
    except Exception as e:
        print(f"❌ Face recognition error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register_employee():
    """Register new employee with face recognition"""
    try:
        data = request.json or {}
        print(f"📝 REGISTRATION - Data keys: {list(data.keys())}")
        
        name = data.get('name')
        department = data.get('department', 'General')
        position = data.get('position', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        
        if not name:
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        # Extract embeddings from images
        if 'images' in data and data['images']:
            print(f"📸 Processing {len(data['images'])} images...")
            extract_result = face_engine.extract_multiple_embeddings(data['images'])
            
            if not extract_result.get('success'):
                return jsonify({
                    'success': False,
                    'error': extract_result.get('error', 'Failed to extract faces from images')
                }), 400
            
            face_embeddings = extract_result['embeddings']
            avg_confidence = extract_result['avg_confidence']
            
        elif 'image' in data:
            print("📸 Processing single image...")
            extract_result = face_engine.extract_face_embedding(data['image'])
            
            if not extract_result.get('success'):
                return jsonify({
                    'success': False,
                    'error': extract_result.get('error', 'Failed to extract face from image')
                }), 400
            
            face_embeddings = [extract_result['embedding']]
            avg_confidence = extract_result['confidence']
            
        elif 'faceEmbeddings' in data or 'faceEmbedding' in data:
            print("⚠️ Using direct embeddings (not recommended)")
            face_embeddings = data.get('faceEmbeddings') or [data.get('faceEmbedding')]
            avg_confidence = 0.95
            
        else:
            return jsonify({
                'success': False,
                'error': 'No images or embeddings provided. Please provide "images" or "image" field.'
            }), 400
        
        print(f"✅ Extracted {len(face_embeddings)} face embedding(s)")
        print(f"   Average detection confidence: {avg_confidence:.3f}")
        
        # Validate embeddings
        for i, emb in enumerate(face_embeddings):
            if not isinstance(emb, list) or len(emb) != 512:
                return jsonify({
                    'success': False,
                    'error': f'Invalid embedding {i+1}: expected 512 dimensions, got {len(emb)}'
                }), 400
        
        # Register to database
        result = db.register_employee_face(
            name=name,
            face_embeddings=face_embeddings,
            department=department,
            position=position,
            email=email,
            phone=phone
        )
        
        if result.get('success'):
            print(f"✅ Employee registered: {result.get('employee_id')}")
            return jsonify({
                'success': True,
                'employee_id': result.get('employee_id'),
                'message': 'Employee registered successfully',
                'embedding_count': len(face_embeddings),
                'avg_confidence': avg_confidence
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error')
            }), 500
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/face-engine/info', methods=['GET'])
def get_face_engine_info():
    """Get information about the face recognition engine"""
    try:
        info = face_engine.get_model_info()
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify-face', methods=['POST'])
def verify_face():
    """Verify if two images contain the same person"""
    try:
        data = request.json or {}
        
        image1 = data.get('image1')
        image2 = data.get('image2')
        threshold = data.get('threshold', 0.6)
        
        if not image1 or not image2:
            return jsonify({'error': 'Both image1 and image2 are required'}), 400
        
        result = face_engine.verify_face(image1, image2, threshold)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Face verification error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/test-face-engine', methods=['GET'])
def test_face_engine():
    """Test if face engine is loaded"""
    try:
        info = face_engine.get_model_info()
        return jsonify({
            'status': 'ok',
            'face_engine': info,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500
        
# ==================== UTILITY ENDPOINTS ====================

@app.route('/api/system/cleanup', methods=['POST'])
def cleanup_system():
    """System cleanup"""
    return jsonify({'success': True, 'message': 'Cleanup completed'})

@app.route('/api/test-db', methods=['GET'])
def test_db():
    """Test database connection and data"""
    try:
        employees_count = db.employees.count_documents({})
        attendance_count = db.attendance.count_documents({})
        
        today = datetime.now().strftime('%Y-%m-%d')
        today_attendance = list(db.attendance.find({'date': today}).limit(5))
        
        return jsonify({
            'success': True,
            'employees_count': employees_count,
            'attendance_count': attendance_count,
            'today_attendance_count': len(today_attendance),
            'sample_data': [
                {
                    'employee_id': att.get('employee_id'),
                    'employee_name': att.get('employee_name'),
                    'date': att.get('date'),
                    'has_checkin': att.get('checkin') is not None,
                    'has_checkout': att.get('checkout') is not None,
                    'work_duration': att.get('work_duration_minutes', 0)
                }
                for att in today_attendance
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
    print("📁 New Structure: Nested checkin/checkout per employee per day")
    print("🎯 CORS enabled for: http://localhost:5173")
    print("")
    print("Attendance Structure:")
    print("  - 1 document per employee per day")
    print("  - Nested checkin/checkout objects")
    print("  - Auto-calculated work duration")
    print("=" * 60)
    with app.app_context():
        print("🚀 Flask starting, checking for unsynced data...")
        try:
            sync_mongo_to_dynamo()
        except Exception as e:
            print(f"❌ Error during startup sync: {e}")
    
    app.run(host='0.0.0.0', port=5000, debug=True)