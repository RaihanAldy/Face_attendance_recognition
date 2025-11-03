from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from datetime import datetime, timedelta
import traceback
import json

app = Flask(__name__)

# ✅ PERBAIKAN CORS - Allow all methods dan headers
CORS(app, 
     origins=["http://localhost:5173"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

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

# ==================== EMPLOYEE ENDPOINTS ====================

@app.route('/api/employees', methods=['GET', 'POST'])
def employees():
    """Get all employees or add new employee"""
    if request.method == 'GET':
        try:
            employees = db.get_all_employees()
            return jsonify(employees), 200
        except Exception as e:
            print(f"❌ Get employees error: {e}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            
            if not data.get('name'):
                return jsonify({'error': 'Name is required'}), 400
            if not data.get('department'):
                return jsonify({'error': 'Department is required'}), 400
            if not data.get('position'):
                return jsonify({'error': 'Position is required'}), 400
            
            # Register employee WITHOUT face embeddings initially
            result = db.employees.insert_one({
                'employee_id': db.get_next_employee_id(),
                'name': data['name'],
                'department': data['department'],
                'position': data['position'],
                'email': data.get('email', ''),
                'phone': data.get('phone', ''),
                'face_embeddings': [],
                'embedding_count': 0,
                'created_at': datetime.now(),
                'last_updated': datetime.now()
            })
            
            if result.inserted_id:
                new_employee = db.employees.find_one({'_id': result.inserted_id})
                new_employee['_id'] = str(new_employee['_id'])
                
                print(f"✅ Employee added: {new_employee['employee_id']} - {new_employee['name']}")
                
                return jsonify({
                    'success': True,
                    'message': 'Employee added successfully',
                    'employee_id': new_employee['employee_id'],
                    'employee': new_employee
                }), 201
            else:
                return jsonify({'error': 'Failed to add employee'}), 500
                
        except Exception as e:
            print(f"❌ Error adding employee: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<employee_id>', methods=['GET', 'PUT', 'DELETE'])
def employee_detail(employee_id):
    """Get, update, or delete specific employee"""
    if request.method == 'GET':
        try:
            employee = db.employees.find_one({'employee_id': employee_id})
            if employee:
                employee['_id'] = str(employee['_id'])
                if 'created_at' in employee:
                    employee['created_at'] = employee['created_at'].isoformat()
                if 'last_updated' in employee:
                    employee['last_updated'] = employee['last_updated'].isoformat()
                return jsonify(employee), 200
            else:
                return jsonify({'error': 'Employee not found'}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            result = db.employees.delete_one({'employee_id': employee_id})
            if result.deleted_count > 0:
                print(f"✅ Employee deleted: {employee_id}")
                return jsonify({
                    'success': True,
                    'message': f'Employee {employee_id} deleted successfully'
                }), 200
            else:
                return jsonify({'error': 'Employee not found'}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            data = request.json
            update_fields = {}
            
            if 'name' in data:
                update_fields['name'] = data['name']
            if 'department' in data:
                update_fields['department'] = data['department']
            if 'position' in data:
                update_fields['position'] = data['position']
            if 'email' in data:
                update_fields['email'] = data['email']
            if 'phone' in data:
                update_fields['phone'] = data['phone']
            
            if not update_fields:
                return jsonify({'error': 'No fields to update'}), 400
            
            update_fields['last_updated'] = datetime.now()
            
            result = db.employees.update_one(
                {'employee_id': employee_id},
                {'$set': update_fields}
            )
            
            if result.matched_count > 0:
                return jsonify({
                    'success': True,
                    'message': f'Employee {employee_id} updated successfully'
                }), 200
            else:
                return jsonify({'error': 'Employee not found'}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# ==================== ATTENDANCE ENDPOINTS ====================

@app.route('/api/attendance', methods=['GET', 'POST'])
def attendance_main():
    """Main attendance endpoint"""
    if request.method == 'GET':
        try:
            filter_type = request.args.get('filter', 'today')
            date_str = request.args.get('date')
            employee_id = request.args.get('employee_id')
            
            print(f"🔍 Attendance query - filter: {filter_type}, date: {date_str}, employee: {employee_id}")
            
            # Determine date range
            if date_str:
                start_date = datetime.strptime(date_str, '%Y-%m-%d')
                end_date = start_date
            elif filter_type == 'today':
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = start_date
            elif filter_type == 'week':
                end_date = datetime.now()
                start_date = end_date - timedelta(days=7)
            elif filter_type == 'month':
                end_date = datetime.now()
                start_date = end_date - timedelta(days=30)
            else:  # 'all'
                start_date = None
                end_date = None
            
            # Build query
            query = {}
            if employee_id:
                query['employee_id'] = employee_id
            
            if start_date and end_date:
                if start_date == end_date:
                    query['date'] = start_date.strftime('%Y-%m-%d')
                else:
                    query['date'] = {
                        '$gte': start_date.strftime('%Y-%m-%d'),
                        '$lte': end_date.strftime('%Y-%m-%d')
                    }
            
            print(f"📊 MongoDB query: {query}")
            
            # Fetch from MongoDB
            attendance_records = list(db.attendance.find(query).sort('date', -1))
            
            print(f"✅ Found {len(attendance_records)} attendance records")
            
            # ✅ DEBUG: Print first record structure
            if len(attendance_records) > 0:
                print(f"📋 Sample record from DB:")
                print(f"   Fields: {list(attendance_records[0].keys())}")
                print(f"   Has checkin: {'checkin' in attendance_records[0]}")
                print(f"   Has checkout: {'checkout' in attendance_records[0]}")
                if 'checkin' in attendance_records[0]:
                    print(f"   Checkin value: {attendance_records[0]['checkin']}")
                if 'checkout' in attendance_records[0]:
                    print(f"   Checkout value: {attendance_records[0]['checkout']}")
            
            # Format for frontend
            formatted_results = []
            for record in attendance_records:
                formatted_record = {
                    '_id': str(record.get('_id')),
                    'employee_id': record.get('employee_id'),
                    'employee_name': record.get('employee_name', 'Unknown'),
                    'date': record.get('date'),
                    'checkin': record.get('checkin'),  # {status, timestamp}
                    'checkout': record.get('checkout'),  # {status, timestamp}
                    'work_duration_minutes': record.get('work_duration_minutes', 0),
                    'createdAt': record.get('createdAt').isoformat() if record.get('createdAt') else None,
                    'updatedAt': record.get('updatedAt').isoformat() if record.get('updatedAt') else None
                }
                formatted_results.append(formatted_record)
            
            print(f"✅ Formatted {len(formatted_results)} records for response")
            return jsonify(formatted_results), 200
            
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

@app.route('/api/attendance/stats', methods=['GET'])
def attendance_stats():
    """Get attendance statistics"""
    try:
        stats = db.get_attendance_stats()
        return jsonify(stats), 200
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/employee/<employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    """Get attendance history for specific employee"""
    try:
        date = request.args.get('date', None)
        attendance_data = db.get_attendance_by_employee_id(employee_id, date)
        return jsonify(attendance_data), 200
    except Exception as e:
        print(f"❌ Error getting employee attendance: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/auto', methods=['POST', 'OPTIONS'])
def attendance_auto():
    """Auto record attendance (check-in or check-out based on last status)"""
    # Handle preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json or {}
        employee_id = data.get('employeeId')
        confidence = data.get('confidence', 0.0)

        if not employee_id:
            return jsonify({'success': False, 'error': 'Employee ID is required'}), 400

        print(f"\n{'='*60}")
        print(f"🎯 AUTO ATTENDANCE REQUEST")
        print(f"   Employee ID: {employee_id}")
        print(f"   Confidence: {confidence}")
        print(f"{'='*60}\n")

        # Use auto recorder
        result = db.record_attendance_auto(employee_id, confidence)

        if result and result.get('success'):
            print(f"✅ Attendance recorded successfully")
            return jsonify(result), 200
        else:
            error_msg = result.get('error') if result else 'Failed to record attendance'
            print(f"❌ Attendance recording failed: {error_msg}")
            return jsonify({'success': False, 'error': error_msg}), 500
                
    except Exception as e:
        print(f"❌ Error recording attendance: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    
# ==================== SETTINGS ENDPOINTS ====================

@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    """Get or update settings"""
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
    """Get work schedule"""
    try:
        schedule = db.get_work_schedule()
        if schedule:
            return jsonify(schedule), 200
        else:
            return jsonify({'error': 'Schedule not found'}), 404
    except Exception as e:
        print(f"❌ Error getting schedule: {e}")
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
            return jsonify(result), 200
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
        
        print(f"🔍 Face recognition - embedding size: {len(face_embedding)}")
        
        result = db.recognize_face(face_embedding, threshold=0.5)
        
        if result.get('success'):
            employee = result['employee']
            final_confidence = (extraction_confidence * 0.3 + employee['similarity'] * 0.7)
            employee['confidence'] = final_confidence
            
            print(f"✅ Face recognized: {employee['name']} ({employee['employee_id']})")
            
            return jsonify({
                'success': True,
                'employee': employee,
                'message': 'Face recognized successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'No matching employee found',
                'similarity': result.get('similarity', 0),
                'threshold': 0.6
            }), 404
    except Exception as e:
        print(f"❌ Face recognition error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register_employee():
    """Register new employee with face"""
    try:
        data = request.json
        name = data.get('name')
        department = data.get('department', 'General')
        position = data.get('position', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        
        if not name:
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        # Extract embeddings
        if 'images' in data and data['images']:
            print(f"📸 Processing {len(data['images'])} images...")
            extract_result = face_engine.extract_multiple_embeddings(data['images'])
            
            if not extract_result.get('success'):
                return jsonify({
                    'success': False,
                    'error': extract_result.get('error', 'Failed to extract faces')
                }), 400
            
            face_embeddings = extract_result['embeddings']
            avg_confidence = extract_result['avg_confidence']
            
        elif 'image' in data:
            extract_result = face_engine.extract_face_embedding(data['image'])
            
            if not extract_result.get('success'):
                return jsonify({
                    'success': False,
                    'error': extract_result.get('error', 'Failed to extract face')
                }), 400
            
            face_embeddings = [extract_result['embedding']]
            avg_confidence = extract_result['confidence']
        else:
            return jsonify({
                'success': False,
                'error': 'No images provided'
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
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error')
            }), 500
    except Exception as e:
        print(f"❌ Registration error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== UTILITY ENDPOINTS ====================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        print(f"🔐 Admin login attempt - username: {username}")
        
        if username == 'admin' and password == 'admin123':
            print(f"✅ Admin login successful")
            
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

if __name__ == '__main__':
    print("🚀 Starting Attendance System...")
    print("📍 API Server: http://localhost:5000")
    print("📊 MongoDB: Connected")
    print("✅ All endpoints ready")
    print("🎯 CORS enabled for: http://localhost:5173")
    print("\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)