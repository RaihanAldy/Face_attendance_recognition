# 🚀 Quick Start Guide - Face Attendance System

## Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- MongoDB installed and running

## Backend Setup

### 1. Navigate to backend folder
```bash
cd backend
```

### 2. Create virtual environment
```bash
python -m venv venv
```

### 3. Activate virtual environment
**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Create `.env` file
```bash
# Create .env file in backend folder with:
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=attendance_system
```

### 6. Start backend server
```bash
python app.py
```

Backend will run on: `http://localhost:5000`

---

## Frontend Setup

### 1. Navigate to frontend folder
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

Frontend will run on: `http://localhost:5173`

---

## 📊 API Integration

All dashboard data now fetches from MongoDB:

### Analytics Endpoints:
- `GET /api/analytics/summary` - Summary cards data
- `GET /api/analytics/attendance-trend` - 7-day attendance trend
- `GET /api/analytics/working-duration` - Average working hours
- `GET /api/analytics/departments` - Department statistics
- `GET /api/analytics/hourly-checkins` - Hourly check-in heatmap

### Attendance Endpoints:
- `GET /api/attendance/log?date=YYYY-MM-DD` - Attendance logs
- `POST /api/attendance/checkin` - Record check-in
- `POST /api/attendance/checkout` - Record check-out

### Employee Endpoints:
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Register new employee

---

## 🧪 Testing with Sample Data

### Add test employees:
```bash
# Using MongoDB shell or Compass
db.employees.insertMany([
  {
    employee_id: "EMP001",
    name: "John Doe",
    department: "Engineering",
    is_active: true,
    created_at: new Date()
  },
  {
    employee_id: "EMP002",
    name: "Jane Smith",
    department: "Marketing",
    is_active: true,
    created_at: new Date()
  }
])
```

### Add test attendance:
```bash
db.attendance.insertMany([
  {
    employee_id: "EMP001",
    timestamp: new Date(),
    type: "check_in",
    confidence: 0.95,
    synced: false
  }
])
```

---

## 🔄 Auto-Refresh

Dashboard automatically refreshes every 30 seconds. You can also manually refresh using the "🔄 Refresh" button.

---

## 🐛 Troubleshooting

### Backend not connecting to MongoDB:
1. Make sure MongoDB is running: `mongod`
2. Check `.env` file has correct `MONGODB_URI`

### Frontend can't fetch data:
1. Check backend is running on port 5000
2. Check CORS is enabled in `app.py`
3. Check API_BASE_URL in frontend matches backend URL

### No data showing:
1. Add sample data to MongoDB
2. Check browser console for errors (F12)
3. Check backend terminal for error logs

---

## 📝 Next Steps

- [ ] Integrate real face recognition
- [ ] Add AI Insights generation
- [ ] Add employee photo upload
- [ ] Add notification system
- [ ] Add export to CSV/PDF
