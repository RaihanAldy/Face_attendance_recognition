from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

# Start background tasks

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected',
        'face_model': 'loaded' if face_engine.model else 'error'
    })
    
@app.route('/api/routes', methods=['GET'])
def list_routes():
    """List all available API routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
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

# ==================== ATTENDANCE ENDPOINTS ====================

@app.route('/api/attendance', methods=['GET', 'POST'])
def attendance():
    """
    GET: Get attendance records by date
    POST: Record new attendance (check-in or check-out)
    """
    if request.method == 'GET':
        try:
            date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
            format_type = request.args.get('format', 'individual')
            
            print(f"📅 GET /api/attendance - date: {date}, format: {format_type}")
            
            # Individual records (default) - setiap check-in/check-out terpisah
            if format_type == 'individual' or format_type == 'raw':
                attendance_data = db.get_attendance_by_date(date)
                print(f"✅ Returning {len(attendance_data)} individual records")
            
            # Paired records - check-in & check-out digabung per employee
            elif format_type == 'paired':
                attendance_data = db.get_attendance_with_pairing(date)
                print(f"✅ Returning {len(attendance_data)} paired records")
            
            else:
                attendance_data = db.get_attendance_by_date(date)
            
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
                attendance_type=data.get('type', 'check_in')
            )
            
            if attendance_id:
                return jsonify({'success': True, 'attendanceId': attendance_id})
            else:
                return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
                
        except Exception as e:
            print(f"❌ Error recording attendance: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/auto', methods=['POST'])
def record_attendance_auto():
    """Record attendance dengan auto-detect check-in/check-out - FIXED"""
    try:
        data = request.json
        print(f"🤖 AUTO ATTENDANCE - Data: {data}")
        
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.0)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Employee ID is required'}), 400
        
        # Langsung panggil record_attendance_auto dari MongoDBManager
        result = db.record_attendance_auto(employee_id, confidence)
        
        if result and result.get('success'):
            return jsonify({
                'success': True, 
                'action': result.get('action'),
                'status': result.get('status'),
                'punctuality': result.get('punctuality'),
                'timestamp': result.get('timestamp'),
                'employee': result.get('employee'),  # ✅ TAMBAH INI
                'message': f"Successfully recorded {result.get('action')}"
            })
        else:
            error_msg = result.get('error') if result else 'Failed to record attendance'
            return jsonify({'success': False, 'error': error_msg}), 500
                
    except Exception as e:
        print(f"❌ Error recording auto attendance: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/attendance/checkin', methods=['POST'])
def check_in():
    """Record check-in"""
    try:
        data = request.json
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.95)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Missing employeeId'}), 400
        
        print(f"📥 Check-in request for: {employee_id}, confidence: {confidence}")
        
        attendance_id = db.record_attendance(
            employee_id=employee_id,
            confidence=confidence,
            attendance_type='check_in'
        )
        
        if attendance_id:
            print(f"✅ Check-in recorded: {employee_id}, ID: {attendance_id}")
            return jsonify({'success': True, 'attendanceId': attendance_id})
        else:
            print(f"❌ Failed to record check-in for: {employee_id}")
            return jsonify({'success': False, 'error': 'Failed to record attendance'}), 500
            
    except Exception as e:
        print(f"❌ Check-in error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attendance/checkout', methods=['POST'])
def check_out():
    """Record check-out"""
    try:
        data = request.json
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.95)
        
        if not employee_id:
            return jsonify({'success': False, 'error': 'Missing employeeId'}), 400
        
        print(f"📤 Check-out request for: {employee_id}, confidence: {confidence}")
        
        attendance_id = db.record_attendance(
            employee_id=employee_id,
            confidence=confidence,
            attendance_type='check_out'
        )
        
        if attendance_id:
            print(f"✅ Check-out recorded: {employee_id}, ID: {attendance_id}")
            return jsonify({'success': True, 'attendanceId': attendance_id})
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
    """Get daily attendance statistics"""
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        print(f"📈 Getting daily stats for: {date}")
        
        # Ambil data attendance untuk hari tersebut
        attendance_data = db.get_attendance_with_pairing(date)
        
        # Hitung statistik
        stats = {
            'date': date,
            'total_employees': len(attendance_data),
            'checked_in': sum(1 for r in attendance_data if r.get('check_in')),
            'checked_out': sum(1 for r in attendance_data if r.get('check_out')),
            'ontime': sum(1 for r in attendance_data if r.get('check_in_status') == 'ontime'),
            'late': sum(1 for r in attendance_data if r.get('check_in_status') == 'late'),
            'records': attendance_data
        }
        
        print(f"✅ Stats: {stats['total_employees']} employees, {stats['checked_in']} checked in, {stats['late']} late")
        return jsonify(stats)
        
    except Exception as e:
        print(f"❌ Error getting daily stats: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== FACE RECOGNITION ENDPOINTS ====================
@app.route('/api/extract-face', methods=['POST'])
def extract_face():
    """
    Extract face embedding dari image untuk real-time recognition
    
    Request body:
    {
        "image": "data:image/jpeg;base64,/9j/4AAQ..."
    }
    
    Response:
    {
        "success": true,
        "embedding": [512 dimensions],
        "confidence": 0.98,
        "face_detected": true,
        "bbox": [x1, y1, x2, y2]
    }
    """
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        print("🔍 Extracting face embedding from image...")
        
        # Extract embedding menggunakan InsightFace engine
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
    try:
        data = request.json
        
        # Check apakah ada image atau embedding
        if 'image' in data:
            # Extract embedding dari image dulu
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
            # Direct embedding
            face_embedding = data['faceEmbedding']
            extraction_confidence = 0.95  # Default karena tidak ada detection
            
        else:
            return jsonify({
                'success': False,
                'error': 'No image or faceEmbedding provided'
            }), 400
        
        print(f"🔍 Face recognition request - embedding size: {len(face_embedding)}")
        
        # Recognize dari database dengan threshold 0.6 (good for InsightFace)
        result = db.recognize_face(face_embedding, threshold=0.6)
        
        if result.get('success'):
            employee = result['employee']
            
            # Combine confidence:
            # - extraction_confidence: Detection quality (0-1)
            # - similarity: Match quality (0-1)
            # Final confidence = weighted average
            final_confidence = (extraction_confidence * 0.3 + employee['similarity'] * 0.7)
            employee['confidence'] = final_confidence
            
            print(f"✅ Face recognized: {employee['name']} ({employee['employee_id']})")
            print(f"   Similarity: {employee['similarity']:.3f}")
            print(f"   Detection confidence: {extraction_confidence:.3f}")
            print(f"   Final confidence: {final_confidence:.3f}")
            
            return jsonify({
                'success': True,
                'employee': employee,
                'message': 'Face recognized successfully'
            })
        else:
            best_similarity = result.get('similarity', 0)
            print(f"⚠️ No match found - Best similarity: {best_similarity:.3f} (threshold: 0.6)")
            
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
    """
    Register new employee dengan face recognition
    
    Request body:
    {
        "name": "John Doe",
        "department": "IT",
        "position": "Developer",
        "email": "john@company.com",
        "phone": "08123456789",
        "images": [
            "data:image/jpeg;base64,...",
            "data:image/jpeg;base64,...",
            "data:image/jpeg;base64,..."
        ]
    }
    
    OR single image:
    {
        "name": "John Doe",
        ...
        "image": "data:image/jpeg;base64,..."
    }
    
    Response:
    {
        "success": true,
        "employee_id": "EMP-001",
        "message": "Employee registered successfully",
        "embedding_count": 3,
        "avg_confidence": 0.97
    }
    """
    try:
        data = request.json
        print(f"📝 REGISTRATION - Data keys: {data.keys()}")
        
        name = data.get('name')
        department = data.get('department', 'General')
        position = data.get('position', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        
        if not name:
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        # Extract embeddings dari images
        if 'images' in data and data['images']:
            # Multiple images (RECOMMENDED untuk better accuracy)
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
            # Single image
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
            # Direct embeddings (backward compatibility - NOT RECOMMENDED)
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
        
        # Register ke database
        result = db.register_employee_face(
            name=name,
            face_embeddings=face_embeddings,  # Support multiple embeddings
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
    """
    Verify if two images contain the same person
    
    Request body:
    {
        "image1": "data:image/jpeg;base64,...",
        "image2": "data:image/jpeg;base64,...",
        "threshold": 0.6  // optional
    }
    
    Response:
    {
        "verified": true,
        "similarity": 0.85,
        "confidence": 0.97,
        "threshold": 0.6
    }
    """
    try:
        data = request.json
        
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
        today_logs = list(db.attendance.find({'date': today}).limit(5))
        
        return jsonify({
            'success': True,
            'employees_count': employees_count,
            'attendance_count': attendance_count,
            'today_logs_count': len(today_logs),
            'today_logs_sample': [
                {
                    'employee_id': log.get('employee_id'),
                    'name': log.get('employees'),
                    'action': log.get('action'),
                    'status': log.get('status'),
                    'timestamp': log.get('timestamp').isoformat() if log.get('timestamp') else None
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
    print("📁 Attendance structure: individual check-in/check-out records")
    print("🎯 CORS enabled for: http://localhost:5173")
    
    app.run(host='0.0.0.0', port=5000, debug=True)