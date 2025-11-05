from flask import Flask, request, jsonify
from flask_cors import CORS
from mongo_db import db
from face_engine import face_engine
from sync_manager import sync_manager
from datetime import datetime, timedelta
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

@app.route('/api/employees/debug', methods=['GET'])
def employees_debug():
    """Debug endpoint to see ALL employees including inactive"""
    try:
        all_employees = list(db.employees.find({}))
        for emp in all_employees:
            emp['_id'] = str(emp['_id'])
            if 'created_at' in emp and emp['created_at']:
                emp['created_at'] = str(emp['created_at'])
        print(f"📊 Total employees in DB: {len(all_employees)}")
        return jsonify({
            'total': len(all_employees),
            'employees': all_employees
        })
    except Exception as e:
        print(f"❌ Debug error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/debug', methods=['GET'])
def attendance_debug():
    """Debug endpoint to see attendance records with their types"""
    try:
        # Get recent 20 attendance records
        records = list(db.attendance.find({}).sort('timestamp', -1).limit(20))
        
        result = []
        for rec in records:
            result.append({
                'employee_id': rec.get('employee_id'),
                'timestamp': rec.get('timestamp').isoformat() if rec.get('timestamp') else None,
                'action': rec.get('action', 'NO ACTION FIELD'),  # Check action field
                'type': rec.get('type', 'NO TYPE FIELD'),  # Check type field
                'confidence': rec.get('confidence', 0)
            })
        
        # Count by action
        check_in_action = db.attendance.count_documents({'action': 'check_in'})
        check_out_action = db.attendance.count_documents({'action': 'check_out'})
        check_in_action_space = db.attendance.count_documents({'action': 'check in'})
        check_out_action_space = db.attendance.count_documents({'action': 'check out'})
        
        # Count by type (backward compatibility)
        check_in_type = db.attendance.count_documents({'type': 'check_in'})
        check_out_type = db.attendance.count_documents({'type': 'check_out'})
        
        no_field_count = db.attendance.count_documents({'action': {'$exists': False}, 'type': {'$exists': False}})
        
        print(f"📊 Attendance Stats:")
        print(f"  - action='check_in': {check_in_action}")
        print(f"  - action='check in' (with space): {check_in_action_space}")
        print(f"  - action='check_out': {check_out_action}")
        print(f"  - action='check out' (with space): {check_out_action_space}")
        print(f"  - type='check_in': {check_in_type}")
        print(f"  - type='check_out': {check_out_type}")
        print(f"  - No action/type field: {no_field_count}")
        
        return jsonify({
            'total_records': len(result),
            'stats': {
                'action_check_in': check_in_action,
                'action_check_in_space': check_in_action_space,
                'action_check_out': check_out_action,
                'action_check_out_space': check_out_action_space,
                'type_check_in': check_in_type,
                'type_check_out': check_out_type,
                'no_field': no_field_count
            },
            'recent_records': result
        })
    except Exception as e:
        print(f"❌ Debug error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees', methods=['GET', 'POST'])
def employees():
    if request.method == 'GET':
        try:
            employees = db.get_all_employees()
            print(f"📊 Returning {len(employees)} active employees")
            return jsonify(employees)
        except Exception as e:
            print(f"❌ Get employees error: {e}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            result = db.register_employee(
                employee_id=data.get('employee_id'),
                name=data.get('name'),
                department=data.get('department', 'General')
            )
            
            if result.get('success'):
                return jsonify(result), 201
            else:
                return jsonify(result), 400
                
        except Exception as e:
            print(f"❌ Register employee error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

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

@app.route('/api/analytics/attendance-trend', methods=['GET'])
def attendance_trend():
    """Get attendance trend untuk 7 hari (Senin - Minggu)"""
    try:
        from datetime import timedelta
        
        result = []
        today = datetime.now()
        
        # Cari hari Senin minggu ini (0 = Monday, 6 = Sunday)
        days_since_monday = today.weekday()  # 0-6 (Mon-Sun)
        monday_this_week = today - timedelta(days=days_since_monday)
        
        # Generate data untuk 7 hari (Senin - Minggu)
        for i in range(7):
            date = monday_this_week + timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            
            # Count attendance menggunakan date field
            count = db.attendance.count_documents({
                'date': date_str,
                'checkin': {'$exists': True}
            })
            
            result.append({
                'day': date.strftime('%a'),  # Mon, Tue, Wed, Thu, Fri, Sat, Sun
                'count': count,
                'date': date_str
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Attendance trend error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/working-duration', methods=['GET'])
def working_duration():
    """Calculate average working duration hari ini - NEW structure"""
    try:
        today = datetime.now()
        today_str = today.strftime('%Y-%m-%d')
        
        # Get all records today with work_duration_minutes
        attendance_records = list(db.attendance.find({
            'date': today_str,
            'work_duration_minutes': {'$exists': True, '$gt': 0}
        }))
        
        if attendance_records:
            durations_hours = [r['work_duration_minutes'] / 60 for r in attendance_records]
            avg_duration = sum(durations_hours) / len(durations_hours)
            longest = max(durations_hours)
            shortest = min(durations_hours)
        else:
            avg_duration = 0
            longest = 0
            shortest = 0
        
        return jsonify({
            'average': round(avg_duration, 1),
            'longest': round(longest, 1),
            'shortest': round(shortest, 1)
        })
        
    except Exception as e:
        print(f"❌ Working duration error: {e}")
        return jsonify({'error': str(e), 'average': 0, 'longest': 0, 'shortest': 0}), 500

@app.route('/api/analytics/departments', methods=['GET'])
def department_stats():
    """Get attendance count by department - NEW structure"""
    try:
        today = datetime.now()
        today_str = today.strftime('%Y-%m-%d')
        
        pipeline = [
            {
                '$match': {
                    'date': today_str,
                    'checkin': {'$exists': True}
                }
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
                '$unwind': '$employee'
            },
            {
                '$group': {
                    '_id': '$employee.department',
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'count': -1}
            },
            {
                '$limit': 5
            }
        ]
        
        results = list(db.attendance.aggregate(pipeline))
        
        formatted = [
            {
                'type': item['_id'] if item['_id'] else 'General',
                'count': item['count']
            }
            for item in results
        ]
        
        return jsonify(formatted)
        
    except Exception as e:
        print(f"❌ Department stats error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/hourly-checkins', methods=['GET'])
def hourly_checkins():
    """Get check-in distribution by hour using NEW structure (checkin.timestamp)"""
    try:
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Query dengan struktur baru: date field dan checkin.timestamp exists
        pipeline = [
            {
                '$match': {
                    'date': date,
                    'checkin': {'$exists': True},
                    'checkin.timestamp': {'$exists': True}
                }
            },
            {
                '$project': {
                    'hour': {
                        '$hour': {
                            '$dateFromString': {
                                'dateString': '$checkin.timestamp'
                            }
                        }
                    }
                }
            },
            {
                '$group': {
                    '_id': '$hour',
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id': 1}
            }
        ]
        
        results = list(db.attendance.aggregate(pipeline))
        
        total_checkins = sum(item['count'] for item in results)
        print(f"📊 Hourly check-ins for {date}: {total_checkins} total check-ins")
        
        # Create 24-hour array
        hourly_data = [{'hour': f'{i:02d}', 'checkIns': 0} for i in range(24)]
        
        for item in results:
            hour_index = item['_id']
            if 0 <= hour_index < 24:
                hourly_data[hour_index]['checkIns'] = item['count']
        
        return jsonify(hourly_data)
        
    except Exception as e:
        print(f"❌ Hourly check-ins error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/monthly-checkins', methods=['GET'])
def monthly_checkins():
    """Get check-in distribution by date for current month (real-time from MongoDB)"""
    try:
        # Get year and month from query params, default to current month
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        
        # Get first and last day of the month (handles 28-31 days automatically)
        import calendar
        first_day = datetime(year, month, 1)
        days_in_month = calendar.monthrange(year, month)[1]  # Returns (weekday, num_days)
        last_day = datetime(year, month, days_in_month)
        
        # Format as strings for MongoDB query
        start_date_str = first_day.strftime('%Y-%m-%d')
        end_date_str = last_day.strftime('%Y-%m-%d')
        
        print(f"📅 Querying monthly check-ins: {start_date_str} to {end_date_str} ({days_in_month} days)")
        
        # Query attendance for the entire month, group by date
        pipeline = [
            {
                '$match': {
                    'date': {'$gte': start_date_str, '$lte': end_date_str},
                    'checkin': {'$exists': True}
                }
            },
            {
                '$group': {
                    '_id': '$date',
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id': 1}
            }
        ]
        
        results = list(db.attendance.aggregate(pipeline))
        
        total_checkins = sum(item['count'] for item in results)
        print(f"📊 Monthly check-ins for {year}-{month:02d}: {total_checkins} total check-ins across {len(results)} days with data")
        
        # Create array for all days in the month
        monthly_data = []
        for day in range(1, days_in_month + 1):
            date = datetime(year, month, day)
            date_str = date.strftime('%Y-%m-%d')
            
            # Find count for this date
            count = 0
            for item in results:
                if item['_id'] == date_str:
                    count = item['count']
                    break
            
            monthly_data.append({
                'date': date_str,
                'day': str(day),
                'dayName': date.strftime('%a'),  # Mon, Tue, Wed, etc.
                'checkIns': count
            })
        
        return jsonify(monthly_data)
        
    except Exception as e:
        print(f"❌ Monthly check-ins error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/summary', methods=['GET'])
def analytics_summary():
    """Get summary statistics untuk dashboard cards - NEW structure"""
    try:
        today = datetime.now()
        today_str = today.strftime('%Y-%m-%d')
        
        # Total attendance today - menggunakan date field
        total_today = db.attendance.count_documents({
            'date': today_str,
            'checkin': {'$exists': True}
        })
        
        # Late arrivals - menggunakan checkin.status
        # Status bisa "ontime" atau "late"
        late_count = db.attendance.count_documents({
            'date': today_str,
            'checkin.status': 'late'
        })
        
        # Total employees
        total_employees = db.employees.count_documents({'is_active': True})
        
        # Compliance rate
        compliance = round((total_today / total_employees * 100) if total_employees > 0 else 0, 1)
        
        return jsonify({
            'total': total_today,
            'critical': late_count,
            'compliance': compliance,
            'total_employees': total_employees  # Tambahkan untuk chart range
        })
        
    except Exception as e:
        print(f"❌ Summary error: {e}")
        return jsonify({'error': str(e), 'total': 0, 'critical': 0, 'compliance': 0}), 500

def _get_dashboard_stats_for_ai():
    """Fetch all dashboard statistics for AI context"""
    try:
        today = datetime.now()
        today_str = today.strftime('%Y-%m-%d')
        
        # 1. Summary stats
        total_today = db.attendance.count_documents({
            'date': today_str,
            'checkin': {'$exists': True}
        })
        late_count = db.attendance.count_documents({
            'date': today_str,
            'checkin.status': 'late'
        })
        total_employees = db.employees.count_documents({'is_active': True})
        compliance = round((total_today / total_employees * 100) if total_employees > 0 else 0, 1)
        
        summary_stats = {
            'total': total_today,
            'critical': late_count,
            'compliance': compliance,
            'total_employees': total_employees
        }
        
        # 2. Attendance trend (7 days)
        trend_data = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            count = db.attendance.count_documents({
                'date': date_str,
                'checkin': {'$exists': True}
            })
            trend_data.append({
                'day': date.strftime('%a'),
                'count': count
            })
        
        # 3. Department stats
        dept_pipeline = [
            {'$match': {'date': today_str, 'checkin': {'$exists': True}}},
            {'$lookup': {
                'from': 'employees',
                'localField': 'employee_id',
                'foreignField': 'employee_id',
                'as': 'employee_info'
            }},
            {'$unwind': '$employee_info'},
            {'$group': {
                '_id': '$employee_info.department',
                'count': {'$sum': 1}
            }},
            {'$sort': {'count': -1}},
            {'$limit': 10}
        ]
        dept_stats = list(db.attendance.aggregate(dept_pipeline))
        dept_data = [{'department': d['_id'], 'count': d['count']} for d in dept_stats]
        
        # 4. Hourly check-ins
        hourly_pipeline = [
            {'$match': {'date': today_str, 'checkin': {'$exists': True}}},
            {'$project': {
                'hour': {
                    '$hour': {
                        '$dateFromString': {'dateString': '$checkin.timestamp'}
                    }
                }
            }},
            {'$group': {'_id': '$hour', 'count': {'$sum': 1}}},
            {'$sort': {'_id': 1}}
        ]
        hourly_stats = list(db.attendance.aggregate(hourly_pipeline))
        hourly_data = [{'hour': f"{h['_id']:02d}:00", 'count': h['count']} for h in hourly_stats]
        
        # 5. Working duration
        today_records = list(db.attendance.find({
            'date': today_str,
            'work_duration_minutes': {'$exists': True, '$gt': 0}
        }))
        
        if today_records:
            durations = [r['work_duration_minutes'] / 60 for r in today_records]
            duration_stats = {
                'average': round(sum(durations) / len(durations), 1),
                'longest': round(max(durations), 1),
                'shortest': round(min(durations), 1)
            }
        else:
            duration_stats = {'average': 0, 'longest': 0, 'shortest': 0}
        
        return {
            'summary': summary_stats,
            'trend': trend_data,
            'departments': dept_data,
            'hourly': hourly_data,
            'duration': duration_stats
        }
        
    except Exception as e:
        print(f"⚠️  Error fetching dashboard stats: {e}")
        return None

@app.route('/api/analytics/ai-insights', methods=['GET'])
def ai_insights():
    """Generate AI-powered insights from attendance and employee data + dashboard statistics"""
    try:
        from ai_insights import AIInsightsGenerator
        
        # Get time range (default: last 7 days)
        days = int(request.args.get('days', 7))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Fetch attendance data - NEW structure menggunakan date field
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
        
        attendance_records = list(db.attendance.find({
            'date': {'$gte': start_date_str, '$lte': end_date_str}
        }).sort('date', -1))
        
        # Convert ObjectId to strings for JSON
        for record in attendance_records:
            record['_id'] = str(record['_id'])
            # Keep checkin and checkout as is (already have timestamp strings)
        
        # Fetch employee data
        employees = list(db.employees.find({}))
        for emp in employees:
            emp['_id'] = str(emp['_id'])
            if 'created_at' in emp and emp['created_at']:
                emp['created_at'] = str(emp['created_at'])
        
        # Fetch dashboard statistics for richer context
        dashboard_stats = _get_dashboard_stats_for_ai()
        
        if dashboard_stats:
            print(f"🤖 Generating AI insights from {len(attendance_records)} records, {len(employees)} employees + dashboard analytics")
        else:
            print(f"🤖 Generating AI insights from {len(attendance_records)} records and {len(employees)} employees (no dashboard stats)")
        
        # Initialize AI generator (you can change provider and add API key)
        ai_provider = request.args.get('provider', 'openai')  # openai, anthropic, google, groq
        ai_generator = AIInsightsGenerator(ai_provider=ai_provider)
        
        # Generate insights with dashboard context
        insights = ai_generator.generate_insights(attendance_records, employees, dashboard_stats)
        
        return jsonify({
            'success': True,
            'provider': ai_provider,
            'data_range': f'{days} days',
            'insights': insights,
            'stats': {
                'total_records': len(attendance_records),
                'total_employees': len(employees),
                'dashboard_stats_included': dashboard_stats is not None,
                'generated_at': datetime.now().isoformat()
            }
        })
        
    except ImportError as e:
        print(f"❌ AI module import error: {e}")
        return jsonify({
            'success': False,
            'error': 'AI insights module not configured',
            'insights': {
                'summary': 'AI insights temporarily unavailable. Using statistical analysis.',
                'key_findings': [
                    'System is operating normally',
                    'Please configure AI provider for detailed insights',
                    'Check system logs for more information'
                ]
            }
        }), 200
    except Exception as e:
        print(f"❌ AI insights error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'insights': {
                'summary': 'Error generating insights. Please try again.',
                'key_findings': [
                    'System encountered an error',
                    'Fallback analytics available',
                    'Contact support if issue persists'
                ]
            }
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