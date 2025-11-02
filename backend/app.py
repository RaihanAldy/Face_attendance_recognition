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
                return jsonify(result['settings']), 200
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

@app.route('/api/settings/test', methods=['GET'])
def test_settings():
    """Test endpoint untuk check settings"""
    try:
        settings = db.get_settings()
        schedule = db.get_work_schedule()
        
        return jsonify({
            'settings': settings,
            'schedule': schedule,
            'status': 'ok'
        }), 200
        
    except Exception as e:
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
    if request.method == 'GET':
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        attendance_data = db.get_attendance_by_date(date)
        return jsonify(attendance_data)
    
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

@app.route('/api/attendance/log', methods=['GET'])
def get_attendance_log():
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # ✅ GUNAKAN MONGODB, BUKAN IN-MEMORY
        attendance_data = db.get_attendance_with_checkout(date)
        
        return jsonify(attendance_data)
        
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
        
        # Lower threshold for testing
        result = db.recognize_face(face_embedding, threshold=0.5)
        
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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register_employee():
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
@app.route('/api/admin/login', methods=['POST', 'OPTIONS'])
def admin_login():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        print(f"🔐 Admin login attempt - username: {username}")
        
        # Simple auth (production harus pakai JWT!)
        if username == 'admin' and password == 'admin123':
            print(f"✅ Admin login successful: {username}")
            
            import hashlib
            import time
            token = hashlib.sha256(f"{username}{time.time()}".encode()).hexdigest()
            
            return jsonify({
                'success': True,
                'token': token,
                'name': 'Administrator',
                'email': f'{username}@company.com',
                'role': 'admin'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
        
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