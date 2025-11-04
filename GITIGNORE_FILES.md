# 📋 File yang Hilang Setelah Clone (Gitignore List)

**Quick Reference untuk Team yang Clone Repository**

---

## ❌ Files/Folders yang DI-IGNORE Git

### **Backend (`backend/`)**

| File/Folder | Size | Time to Setup | Priority |
|-------------|------|---------------|----------|
| **`.env`** | ~1 KB | 2 min | 🔴 **CRITICAL** |
| `venv/` | ~100-200 MB | 2-5 min | 🔴 **CRITICAL** |
| `__pycache__/` | Auto-generated | N/A | 🟢 Optional |

### **Frontend (`frontend/`)**

| File/Folder | Size | Time to Setup | Priority |
|-------------|------|---------------|----------|
| **`node_modules/`** | ~200-300 MB | 2-5 min | 🔴 **CRITICAL** |
| `dist/` | Auto-generated | N/A | 🟢 Optional |

### **Root**

| File/Folder | Size | Time to Setup | Priority |
|-------------|------|---------------|----------|
| `.vscode/` | ~1 MB | 1 min | 🟡 Optional |
| AI Models (`.onnx`, `.pth`) | Varies | Varies | 🟡 If needed |

---

## 🔑 Most Important: `backend/.env`

**⚠️ WAJIB DIBUAT MANUAL - Contains API Keys!**

### **Template:**

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=face_attendance

# Elice API (AI Insights)
OPENAI_API_KEY=your-elice-api-key-here  # ← REPLACE THIS!
OPENAI_BASE_URL=https://api.elice.io/proxy/openai/v1
OPENAI_MODEL=openai/gpt-4o

# Flask
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000
```

### **How to Get Elice API Key:**

1. Login: https://elice.io/
2. Dashboard → API Keys → OpenAI Proxy
3. Generate New Key
4. Copy key (format: `elice_xxxxxxxxxxxxx`)
5. Paste ke `.env`

### **Important Notes:**

- ⏰ Key expires daily at **23:59:59** (midnight)
- 🔄 Generate new key setiap hari (jam 11:59 AM recommended)
- 🚫 **NEVER commit `.env` to Git!**
- 🔒 Share securely via Slack/password manager

---

## 🚀 Quick Setup Commands

### **After Clone:**

```bash
# 1. Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Edit .env - ADD ELICE API KEY!

# 2. Frontend
cd ../frontend
npm install

# 3. Run
# Terminal 1: Backend
cd backend && python app.py

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 📊 Storage Impact

| Component | Size | Location |
|-----------|------|----------|
| Repository (with git) | ~50 MB | Root |
| Backend venv | ~150 MB | `backend/venv/` |
| Frontend node_modules | ~250 MB | `frontend/node_modules/` |
| MongoDB data | Varies | System MongoDB folder |
| **Total** | **~450 MB** | - |

---

## ⏱️ Setup Time Estimate

| Task | Time |
|------|------|
| Clone repository | 1-2 min |
| Backend venv + pip install | 3-5 min |
| Create .env file | 2 min |
| Frontend npm install | 3-5 min |
| MongoDB setup (if not installed) | 10-15 min |
| **Total** | **15-30 min** |

---

## ✅ Verification Steps

### **1. Backend Check:**
```bash
cd backend
python -c "import flask, pymongo; print('✅ OK')"
```

### **2. Frontend Check:**
```bash
cd frontend
npm list react
```

### **3. .env Check:**
```bash
cd backend
cat .env  # Linux/Mac
type .env  # Windows
# Should show OPENAI_API_KEY with real value
```

### **4. MongoDB Check:**
```bash
mongosh
> show dbs
> use face_attendance
> show collections
# Should show: employees, attendance
```

---

## 🔧 Common Errors

### **"ModuleNotFoundError" (Python)**
```bash
# Solution:
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

### **"Cannot find module" (Node)**
```bash
# Solution:
cd frontend
rm -rf node_modules
npm install
```

### **"MongoDB connection failed"**
```bash
# Solution:
# Windows: net start MongoDB
# Linux: sudo systemctl start mongodb
# Mac: brew services start mongodb-community
```

### **"Unauthorized (401)" - AI Insights**
```bash
# Solution:
# 1. Check .env file exists
# 2. Generate new Elice API key
# 3. Update OPENAI_API_KEY in .env
# 4. Restart backend
```

---

## 📝 Daily Checklist (For Developer)

### **Start of Day:**
```bash
git pull origin aurick
# Check if dependencies changed
pip install -r requirements.txt  # backend
npm install  # frontend
```

### **Every Day (11:59 AM):**
```bash
# 1. Generate new Elice API key (expires at midnight)
# 2. Update backend/.env
# 3. Restart Flask: python app.py
```

### **End of Day:**
```bash
git add .
git commit -m "feat: your changes"
git push origin aurick
```

---

## 📚 Full Documentation

For detailed setup instructions, see: **`SETUP_GUIDE.md`**

For AI Insights setup: **`AI_INSIGHTS_SETUP.md`**

For database structure: **`DATABASE_KEYS_BY_FEATURE.md`**

---

## 🎯 Summary

**Yang PASTI Hilang Setelah Clone:**

1. 🔴 **`backend/.env`** → WAJIB buat manual dengan Elice API key
2. 🔴 **`backend/venv/`** → Run: `python -m venv venv`
3. 🔴 **`frontend/node_modules/`** → Run: `npm install`
4. 🟡 MongoDB database → Create collections & indexes
5. 🟢 `__pycache__/`, `dist/` → Auto-generated saat run

**Total Setup Time:** ~15-30 minutes

**Most Critical:** `.env` file dengan Elice API key yang valid!

---

**Created:** November 4, 2025  
**For:** Team Collaboration via GitHub  
**Branch:** aurick
