"""
Test script untuk API endpoints
Run: python test_api.py
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000/api"

def print_response(title, response):
    print(f"\n{'='*50}")
    print(f"📍 {title}")
    print(f"{'='*50}")
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2, default=str))
    except:
        print(response.text)

def test_health():
    """Test health check endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    print_response("Health Check", response)

def test_employees():
    """Test get all employees"""
    response = requests.get(f"{BASE_URL}/employees")
    print_response("Get All Employees", response)

def test_analytics_summary():
    """Test analytics summary"""
    response = requests.get(f"{BASE_URL}/analytics/summary")
    print_response("Analytics Summary", response)

def test_attendance_trend():
    """Test attendance trend"""
    response = requests.get(f"{BASE_URL}/analytics/attendance-trend")
    print_response("Attendance Trend (7 days)", response)

def test_working_duration():
    """Test working duration"""
    response = requests.get(f"{BASE_URL}/analytics/working-duration")
    print_response("Working Duration", response)

def test_departments():
    """Test department statistics"""
    response = requests.get(f"{BASE_URL}/analytics/departments")
    print_response("Top Departments", response)

def test_hourly_checkins():
    """Test hourly check-ins"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/analytics/hourly-checkins?date={today}")
    print_response("Hourly Check-ins", response)

def test_attendance_log():
    """Test attendance log"""
    today = datetime.now().strftime('%Y-%m-%d')
    response = requests.get(f"{BASE_URL}/attendance/log?date={today}")
    print_response("Attendance Log", response)

def main():
    print("\n🚀 Testing Face Attendance API Endpoints")
    print(f"Base URL: {BASE_URL}")
    
    try:
        # Test all endpoints
        test_health()
        test_employees()
        test_analytics_summary()
        test_attendance_trend()
        test_working_duration()
        test_departments()
        test_hourly_checkins()
        test_attendance_log()
        
        print("\n" + "="*50)
        print("✅ All tests completed!")
        print("="*50)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to API server")
        print("Make sure backend is running on http://localhost:5000")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")

if __name__ == "__main__":
    main()
