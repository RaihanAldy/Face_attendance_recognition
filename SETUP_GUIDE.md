# 🚀 Setup Guide - After Clone from GitHub# 🚀 Quick Start Guide - Face Attendance System



**Target:** Tim yang baru clone repository  ## Prerequisites

**Branch:** aurick  - Python 3.8+ installed

**Last Updated:** 4 November 2025- Node.js 16+ installed

- MongoDB installed and running

---

## Backend Setup

## ⚠️ Files yang TIDAK Masuk Git (Must Create Manually)

### 1. Navigate to backend folder

Karena `.gitignore`, file-file berikut **HARUS dibuat ulang** setelah clone:```bash

cd backend

### **Backend:**```

| File/Folder | Status | Action Required |

|-------------|--------|-----------------|### 2. Create virtual environment

| `backend/.env` | ❌ Ignored | **WAJIB buat manual** (contains API keys) |```bash

| `backend/venv/` | ❌ Ignored | Create virtual environment |python -m venv venv

| `backend/__pycache__/` | ❌ Ignored | Auto-generated saat run |```



### **Frontend:**### 3. Activate virtual environment

| File/Folder | Status | Action Required |**Windows:**

|-------------|--------|-----------------|```bash

| `frontend/node_modules/` | ❌ Ignored | Run `npm install` |venv\Scripts\activate

| `frontend/dist/` | ❌ Ignored | Auto-generated saat build |```



### **Root:****Mac/Linux:**

| File/Folder | Status | Action Required |```bash

|-------------|--------|-----------------|source venv/bin/activate

| `.vscode/` | ❌ Ignored | Optional (editor settings) |```

| AI Model files (`.onnx`, `.pth`) | ❌ Ignored | Download if needed |

### 4. Install dependencies

---```bash

pip install -r requirements.txt

## 📋 Quick Setup Checklist```



```bash### 5. Create `.env` file

☐ 1. Clone repository```bash

☐ 2. Backend: Create venv + install dependencies# Create .env file in backend folder with:

☐ 3. Backend: Create .env file (API keys!)MONGODB_URI=mongodb://localhost:27017

☐ 4. Frontend: npm installDATABASE_NAME=attendance_system

☐ 5. MongoDB: Ensure running```

☐ 6. Run backend + frontend

☐ 7. Test pada browser### 6. Start backend server

``````bash

python app.py

---```



## 🛠️ Detailed Setup StepsBackend will run on: `http://localhost:5000`



### **Step 1: Clone Repository** 📦---



```bash## Frontend Setup

git clone https://github.com/RaihanAldy/Face_attendance_recognition.git

cd Face_attendance_recognition### 1. Navigate to frontend folder

git checkout aurick  # Switch ke branch aurick```bash

```cd frontend

```

---

### 2. Install dependencies

### **Step 2: Backend Setup** 🐍```bash

npm install

#### **2.1. Create Virtual Environment**```



```bash### 3. Start development server

cd backend```bash

npm run dev

# Windows (PowerShell/CMD)```

python -m venv venv

venv\Scripts\activateFrontend will run on: `http://localhost:5173`



# Linux/Mac---

python3 -m venv venv

source venv/bin/activate## 📊 API Integration

```

All dashboard data now fetches from MongoDB:

**Verify:**

```bash### Analytics Endpoints:

which python  # Should point to venv/bin/python- `GET /api/analytics/summary` - Summary cards data

```- `GET /api/analytics/attendance-trend` - 7-day attendance trend

- `GET /api/analytics/working-duration` - Average working hours

#### **2.2. Install Dependencies**- `GET /api/analytics/departments` - Department statistics

- `GET /api/analytics/hourly-checkins` - Hourly check-in heatmap

```bash

pip install -r requirements.txt### Attendance Endpoints:

```- `GET /api/attendance/log?date=YYYY-MM-DD` - Attendance logs

- `POST /api/attendance/checkin` - Record check-in

**Installed packages:**- `POST /api/attendance/checkout` - Record check-out

- Flask (backend framework)

- pymongo (MongoDB driver)### Employee Endpoints:

- python-dotenv (environment variables)- `GET /api/employees` - Get all employees

- openai (AI insights)- `POST /api/employees` - Register new employee

- flask-cors (CORS handling)

- And more...---



**Time:** ~2-5 menit  ## 🧪 Testing with Sample Data

**Size:** ~100-200 MB

### Add test employees:

#### **2.3. Create `.env` File** 🔑```bash

# Using MongoDB shell or Compass

**⚠️ PALING PENTING! File ini contains secrets!**db.employees.insertMany([

  {

```bash    employee_id: "EMP001",

# Windows    name: "John Doe",

copy .env.example .env    department: "Engineering",

notepad .env    is_active: true,

    created_at: new Date()

# Linux/Mac  },

cp .env.example .env  {

nano .env    employee_id: "EMP002",

```    name: "Jane Smith",

    department: "Marketing",

**Template `.env`:**    is_active: true,

```env    created_at: new Date()

# MongoDB Connection  }

MONGODB_URI=mongodb://localhost:27017/])

MONGODB_DB_NAME=face_attendance```



# Elice OpenAI Proxy (for AI Insights)### Add test attendance:

OPENAI_API_KEY=your-elice-api-key-here```bash

OPENAI_BASE_URL=https://api.elice.io/proxy/openai/v1db.attendance.insertMany([

OPENAI_MODEL=openai/gpt-4o  {

    employee_id: "EMP001",

# Flask Configuration    timestamp: new Date(),

FLASK_ENV=development    type: "check_in",

FLASK_DEBUG=True    confidence: 0.95,

FLASK_PORT=5000    synced: false

```  }

])

**🔑 CRITICAL - Elice API Key:**```



1. **Login:** https://elice.io/---

2. **Generate Key:** Dashboard → API Keys → OpenAI Proxy → Generate

3. **Copy key** (format: `elice_xxxxxxxxxxxxx`)## 🔄 Auto-Refresh

4. **Paste** ke `OPENAI_API_KEY=` di `.env`

5. **⏰ Important:** Key expires setiap midnight (23:59:59)Dashboard automatically refreshes every 30 seconds. You can also manually refresh using the "🔄 Refresh" button.

   - Generate new key setiap hari (jam 11:59 AM recommended)

   - AI Insights refresh jam 11 PM (before key expires)---



**❌ JANGAN commit `.env` ke Git!** (Already in .gitignore)## 🐛 Troubleshooting



---### Backend not connecting to MongoDB:

1. Make sure MongoDB is running: `mongod`

### **Step 3: Frontend Setup** ⚛️2. Check `.env` file has correct `MONGODB_URI`



#### **3.1. Install Dependencies**### Frontend can't fetch data:

1. Check backend is running on port 5000

```bash2. Check CORS is enabled in `app.py`

cd ../frontend  # from root project3. Check API_BASE_URL in frontend matches backend URL



npm install### No data showing:

# or1. Add sample data to MongoDB

yarn install2. Check browser console for errors (F12)

```3. Check backend terminal for error logs



**Installed packages:**---

- React + React DOM

- Vite (build tool)## 📝 Next Steps

- Recharts (untuk charts/graphs)

- Tailwind CSS (styling)- [ ] Integrate real face recognition

- Axios (HTTP requests)- [ ] Add AI Insights generation

- [ ] Add employee photo upload

**Time:** ~2-5 menit  - [ ] Add notification system

**Size:** ~200-300 MB (node_modules)- [ ] Add export to CSV/PDF


#### **3.2. Verify Installation**

```bash
npm list --depth=0
```

Should show all dependencies installed.

---

### **Step 4: MongoDB Setup** 🗄️

#### **4.1. Ensure MongoDB Running**

**Check if MongoDB already running:**
```bash
# Windows
net start | findstr MongoDB

# Linux
sudo systemctl status mongodb

# Mac
brew services list | grep mongodb
```

**If not running, start it:**
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongodb

# Mac
brew services start mongodb-community
```

#### **4.2. Verify Connection**

```bash
mongosh
# or older version:
mongo
```

Should connect to `mongodb://localhost:27017/`

#### **4.3. Create Database Structure**

```javascript
// In mongosh/mongo shell:

use face_attendance

// Create collections
db.createCollection("employees")
db.createCollection("attendance")

// Create indexes (IMPORTANT for performance!)
db.attendance.createIndex({ "date": 1 })
db.attendance.createIndex({ "employee_id": 1 })
db.attendance.createIndex({ "date": 1, "employee_id": 1 })
db.employees.createIndex({ "employee_id": 1 }, { unique: true })
db.employees.createIndex({ "department": 1 })

// Verify
db.getCollectionNames()
// Should show: ["employees", "attendance"]
```

---

### **Step 5: Run the Application** 🚀

#### **5.1. Start Backend (Terminal 1)**

```bash
cd backend

# Activate venv first!
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Run Flask
python app.py
# or
flask run
```

**Expected output:**
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
✅ MongoDB connected: face_attendance
✅ Collections found: employees, attendance
```

**Test API:**
```
http://localhost:5000/api/analytics/summary
```

#### **5.2. Start Frontend (Terminal 2)**

```bash
cd frontend

npm run dev
# or
yarn dev
```

**Expected output:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

#### **5.3. Open Browser**

```
http://localhost:5173
```

Dashboard should load with:
- ✅ Analytics cards (Total, Late, Compliance, Working Duration)
- ✅ Charts (Attendance Trend, Departments, Hourly Check-ins)
- ✅ AI Insights (if API key valid)

---

## ✅ Verification Checklist

### **Backend Verification:**
```bash
cd backend
python -c "import flask, pymongo, openai; print('✅ All packages installed')"
python test_elice.py  # Test AI Insights
python check_today_data.py  # Check MongoDB data
```

### **Frontend Verification:**
```bash
cd frontend
npm list react recharts  # Check key packages
```

### **Full System Test:**
1. ✅ Backend running: `http://localhost:5000/api/analytics/summary` returns JSON
2. ✅ Frontend running: `http://localhost:5173` loads dashboard
3. ✅ MongoDB connected: Check backend console logs
4. ✅ AI Insights working: Dashboard shows AI summary (if key valid)

---

## 🔧 Common Issues & Solutions

### **Issue 1: `ModuleNotFoundError` (Python)**

**Error:**
```
ModuleNotFoundError: No module named 'flask'
```

**Solution:**
```bash
# Make sure venv is activated!
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Reinstall
pip install -r requirements.txt
```

---

### **Issue 2: `Cannot find module` (Node)**

**Error:**
```
Error: Cannot find module 'react'
```

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

### **Issue 3: MongoDB Connection Failed**

**Error:**
```
pymongo.errors.ServerSelectionTimeoutError
```

**Solution:**
```bash
# Start MongoDB
# Windows:
net start MongoDB

# Linux:
sudo systemctl start mongodb

# Mac:
brew services start mongodb-community
```

---

### **Issue 4: Elice API Key Invalid**

**Error:**
```
❌ AI Insights error: Unauthorized (401)
```

**Solution:**
1. Check `.env` file exists in `backend/`
2. Generate new key from Elice (keys expire daily at midnight)
3. Update `OPENAI_API_KEY=` in `.env`
4. Restart backend

---

### **Issue 5: Port Already in Use**

**Error:**
```
OSError: Address already in use
```

**Solution:**
```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

---

## 📝 Daily Maintenance

### **Every Day (11:59 AM):**
1. Generate new Elice API key
2. Update `backend/.env`
3. Restart Flask backend

### **Why Daily?**
- Elice keys expire at 23:59:59 (midnight)
- AI Insights refresh at 11 PM
- Need valid key for refresh

---

## 👥 Team Collaboration Tips

### **Before You Start Work:**
```bash
git pull origin aurick
pip install -r requirements.txt  # if backend updated
npm install  # if frontend updated
```

### **After You Make Changes:**
```bash
git add .
git commit -m "feat: your changes description"
git push origin aurick
```

### **Sharing .env Securely:**
**❌ DON'T:** Commit to Git  
**✅ DO:** Share via:
- Slack/Teams (private DM)
- Password manager
- Encrypted file

---

## 📚 Additional Documentation

| File | Description |
|------|-------------|
| `AI_INSIGHTS_SETUP.md` | AI Insights configuration & refresh schedule |
| `DATABASE_KEYS_BY_FEATURE.md` | Database fields used by each feature |
| `DASHBOARD_DATABASE_MAPPING.md` | Complete feature-to-database mapping |
| `ELICE_SETUP.md` | Elice API setup & troubleshooting |

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Clone & checkout
git clone https://github.com/RaihanAldy/Face_attendance_recognition.git
cd Face_attendance_recognition
git checkout aurick

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env - ADD ELICE API KEY!

# 3. Frontend
cd ../frontend
npm install

# 4. Run (2 terminals)
# Terminal 1:
cd backend && python app.py

# Terminal 2:
cd frontend && npm run dev

# 5. Open: http://localhost:5173
```

**Setup Time:** 15-30 minutes

---

## ✅ Final Checklist

Before reporting "setup complete":

```
☐ Repository cloned to local
☐ Switched to branch 'aurick'
☐ Backend venv created
☐ Backend dependencies installed
☐ Frontend node_modules installed
☐ MongoDB running
☐ Database 'face_attendance' created
☐ Collections created (employees, attendance)
☐ Indexes created
☐ .env file created with valid Elice API key
☐ Backend starts without errors (port 5000)
☐ Frontend starts without errors (port 5173)
☐ Dashboard loads in browser
☐ API calls successful (check Network tab)
☐ AI Insights displays (if API key valid)
```

---

**Setup Complete!** 🎉

**Questions?**
- Check documentation files
- Ask team lead
- Create GitHub issue

---

**Version:** 2.1  
**Branch:** aurick  
**Last Updated:** November 4, 2025
