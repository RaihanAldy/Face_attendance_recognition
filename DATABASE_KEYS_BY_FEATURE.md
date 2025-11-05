# 🔑 Database Keys/Fields Used by Each Dashboard Feature

**Last Updated:** November 5, 2025  
**Version:** 4.0 (Monthly Check-ins + Dynamic Ranges Update)

---

## 📋 Quick Reference Table

| Dashboard Feature | Collection | Keys/Fields Used |
|-------------------|------------|------------------|
| **Total Attendance** | `attendance` | `date`, `checkin` |
| **Late Arrivals** | `attendance` | `date`, `checkin.status` |
| **Compliance Rate** | `attendance` + `employees` | `date`, `checkin`, `is_active` |
| **Working Duration** | `attendance` | `date`, `work_duration_minutes` |
| **Attendance Trend** | `attendance` | `date`, `checkin` + Dynamic Y-axis (`totalEmployees * 1.2`) |
| **Top Departments** | `attendance` + `employees` | `date`, `checkin`, `employee_id`, `department` + Dynamic Y-axis (`totalEmployees * 1.2`) |
| **Monthly Check-In** | `attendance` | `date`, `checkin` + Dynamic color thresholds (80%, 55%, 35%, 15% of `totalEmployees`) |
| **AI Insights (Hybrid)** | `attendance` + `employees` + Dashboard Stats | All 14 attendance keys + 4 employee keys + 5 dashboard stat sources |

---

## 🗄️ Complete Database Schema

### **Collection: `attendance`**
```javascript
{
  _id: ObjectId,                         // MongoDB auto-generated
  date: "2025-11-04",                    // ✅ String YYYY-MM-DD
  employee_id: "E001",                   // ✅ String, FK to employees
  employee_name: "John Doe",             // ✅ String
  checkin: {                             // ✅ Object
    status: "ontime" | "late",           // ✅ String enum
    timestamp: "2025-11-04T08:30:00"     // ✅ String ISO format
  },
  checkout: {                            // ✅ Object or null
    status: "ontime",                    // ✅ String
    timestamp: "2025-11-04T17:30:00"     // ✅ String ISO format
  },
  work_duration_minutes: 540,            // ✅ Integer (calculated)
  createdAt: ISODate(),                  // ✅ MongoDB ISODate
  updatedAt: ISODate()                   // ✅ MongoDB ISODate
}
```

### **Collection: `employees`**
```javascript
{
  _id: ObjectId,                         // MongoDB auto-generated
  employee_id: "E001",                   // ✅ String, unique ID
  name: "John Doe",                      // ✅ String
  department: "Engineering",             // ✅ String
  is_active: true,                       // ✅ Boolean
  created_at: ISODate()                  // ✅ MongoDB ISODate
}
```

---

## 🎯 Feature-by-Feature Breakdown

### 1️⃣ **Total Attendance Card**
**Endpoint:** `/api/analytics/summary`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter hari ini |
| `attendance` | `checkin` | Object | Verifikasi ada check-in |

#### Query:
```python
db.attendance.count_documents({
    'date': '2025-11-04',      # ← date key
    'checkin': {'$exists': True}  # ← checkin key
})
```

---

### 2️⃣ **Late Arrivals Card**
**Endpoint:** `/api/analytics/summary`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter hari ini |
| `attendance` | `checkin.status` | String | Filter status 'late' |

#### Query:
```python
db.attendance.count_documents({
    'date': '2025-11-04',           # ← date key
    'checkin.status': 'late'        # ← checkin.status key (nested)
})
```

#### Status Values:
- `"ontime"` - Check-in sebelum 09:00
- `"late"` - Check-in setelah 09:00

---

### 3️⃣ **Compliance Rate Card**
**Endpoint:** `/api/analytics/summary`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter hari ini |
| `attendance` | `checkin` | Object | Hitung yang hadir |
| `employees` | `is_active` | Boolean | Hitung total karyawan aktif |

#### Query:
```python
# Total hadir hari ini
total_today = db.attendance.count_documents({
    'date': '2025-11-04',          # ← date key
    'checkin': {'$exists': True}   # ← checkin key
})

# Total karyawan aktif
total_employees = db.employees.count_documents({
    'is_active': True              # ← is_active key
})

# Compliance = (hadir / total) * 100
compliance = (total_today / total_employees) * 100
```

---

### 4️⃣ **Average Working Duration Card**
**Endpoint:** `/api/analytics/working-duration`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter hari ini |
| `attendance` | `work_duration_minutes` | Integer | Durasi kerja dalam menit |

#### Query:
```python
records = db.attendance.find({
    'date': '2025-11-04',                    # ← date key
    'work_duration_minutes': {               # ← work_duration_minutes key
        '$exists': True, 
        '$gt': 0
    }
})

# Convert to hours
durations_hours = [r['work_duration_minutes'] / 60 for r in records]
average = sum(durations_hours) / len(durations_hours)
```

#### Calculation:
- ✅ **Saved during checkout:** `work_duration_minutes = (checkout_time - checkin_time) / 60`
- ✅ **Display:** `work_duration_minutes / 60` (convert to hours)

---

### 5️⃣ **Attendance Trend Chart (7 Days)**
**Endpoint:** `/api/analytics/attendance-trend`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter per tanggal (7 hari) |
| `attendance` | `checkin` | Object | Verifikasi ada check-in |

#### Query:
```python
# Loop 7 hari (Senin - Minggu)
for date_str in ['2025-11-04', '2025-11-05', ...]:
    count = db.attendance.count_documents({
        'date': date_str,              # ← date key (loop 7x)
        'checkin': {'$exists': True}   # ← checkin key
    })
```

#### Output:
```javascript
[
  {day: 'Mon', count: 45, date: '2025-11-04'},
  {day: 'Tue', count: 50, date: '2025-11-05'},
  ...
]
```

---

### 6️⃣ **Top Departments by Attendance**
**Endpoint:** `/api/analytics/departments`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter hari ini |
| `attendance` | `checkin` | Object | Verifikasi check-in |
| `attendance` | `employee_id` | String | Join ke employees |
| `employees` | `employee_id` | String | FK untuk join |
| `employees` | `department` | String | Group by department |

#### Query (Aggregation):
```python
pipeline = [
    # 1. Filter attendance hari ini
    {'$match': {
        'date': '2025-11-04',              # ← date key
        'checkin': {'$exists': True}       # ← checkin key
    }},
    
    # 2. Join dengan employees
    {'$lookup': {
        'from': 'employees',
        'localField': 'employee_id',       # ← employee_id key (attendance)
        'foreignField': 'employee_id',     # ← employee_id key (employees)
        'as': 'employee'
    }},
    
    # 3. Unwind
    {'$unwind': '$employee'},
    
    # 4. Group by department
    {'$group': {
        '_id': '$employee.department',     # ← department key (nested)
        'count': {'$sum': 1}
    }},
    
    # 5. Sort & limit
    {'$sort': {'count': -1}},
    {'$limit': 5}
]
```

#### Output:
```javascript
[
  {type: 'Engineering', count: 25},
  {type: 'Sales', count: 18},
  {type: 'Marketing', count: 12},
  ...
]
```

---

### 7️⃣ **Monthly Check-In Activity (Calendar Heatmap)** 🆕
**Endpoint:** `/api/analytics/monthly-checkins`

#### Keys Used:
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter bulan tertentu & group by date |
| `attendance` | `checkin` | Object | Verifikasi ada check-in |

#### Query (Aggregation):
```python
# Get year and month (default: current month)
year = int(request.args.get('year', datetime.now().year))
month = int(request.args.get('month', datetime.now().month))

# Dynamic days calculation (28-31)
import calendar
days_in_month = calendar.monthrange(year, month)[1]
first_day = datetime(year, month, 1)
last_day = datetime(year, month, days_in_month)

pipeline = [
    # 1. Filter by month range
    {'$match': {
        'date': {
            '$gte': first_day.strftime('%Y-%m-%d'),  # ← date key (range)
            '$lte': last_day.strftime('%Y-%m-%d')
        },
        'checkin': {'$exists': True}  # ← checkin key
    }},
    
    # 2. Group by date
    {'$group': {
        '_id': '$date',
        'count': {'$sum': 1}
    }},
    
    {'$sort': {'_id': 1}}
]
```

#### Output:
```javascript
[
  {date: '2025-11-01', day: '1', dayName: 'Fri', checkIns: 45},
  {date: '2025-11-02', day: '2', dayName: 'Sat', checkIns: 0},
  {date: '2025-11-03', day: '3', dayName: 'Sun', checkIns: 0},
  ...
  {date: '2025-11-30', day: '30', dayName: 'Sat', checkIns: 38}
]
```

#### Dynamic Features:
- **Days Handling:** 28-31 days using `calendar.monthrange()` (handles leap years)
- **Grid Layout:** 7-column grid starting from Sunday
- **Color Thresholds (based on `totalEmployees`):**
  - 🔴 Red: ≥80% attendance (excellent)
  - 🟠 Orange: ≥55% attendance (good)
  - 🟡 Yellow: ≥35% attendance (moderate)
  - 🔵 Blue: ≥15% attendance (low)
  - ⚫ Slate: >0% (very low)
- **Sunday Highlight:** Purple ring on Sunday cells

---

### 8️⃣ **AI Insights Summary** 🆕 HYBRID
**Endpoint:** `/api/analytics/ai-insights`

#### Keys Used (Database + Dashboard Stats):

**From Attendance Collection:**
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `attendance` | `date` | String | Filter 7 hari terakhir |
| `attendance` | `employee_id` | String | Identify records |
| `attendance` | `employee_name` | String | Display names |
| `attendance` | `checkin` | Object | Hitung total attendance |
| `attendance` | `checkin.status` | String | Hitung late arrivals |
| `attendance` | `checkin.timestamp` | String | Hourly patterns |
| `attendance` | `checkout` | Object | Check-out verification |
| `attendance` | `work_duration_minutes` | Integer | Average working hours |

**From Employees Collection:**
| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `employees` | `employee_id` | String | Join key |
| `employees` | `name` | String | Employee info |
| `employees` | `department` | String | Department analysis |
| `employees` | `is_active` | Boolean | Active employees count |

**Dashboard Stats (Pre-calculated):**
| Source | Data | Purpose |
|--------|------|---------|
| Summary endpoint | `total`, `critical`, `compliance`, `total_employees` | Today's metrics |
| Trend endpoint | 7-day attendance counts | Weekly patterns |
| Departments endpoint | Per-department counts | Department performance |
| Hourly endpoint | Peak check-in hours | Timing patterns |
| Duration endpoint | `average`, `longest`, `shortest` | Working hours analysis |

#### Query:
```python
# 1. Get attendance data (7 days)
attendance_data = db.attendance.find({
    'date': {                               # ← date key
        '$gte': '2025-10-28',
        '$lte': '2025-11-04'
    },
    'checkin': {'$exists': True}            # ← checkin key
})

# 2. Analyze patterns
late_count = sum(1 for r in attendance_data 
                 if r['checkin']['status'] == 'late')  # ← checkin.status key

avg_duration = avg([r['work_duration_minutes']        # ← work_duration_minutes key
                    for r in attendance_data 
                    if r.get('work_duration_minutes', 0) > 0])

# 3. Employee data
employees = db.employees.find({
    'is_active': True                       # ← is_active key
})

departments = [e['department'] for e in employees]  # ← department key
```

#### Generated Insights:
- Attendance patterns (trend naik/turun)
- Punctuality analysis (% late arrivals)
- Working duration trends
- Department performance
- Recommendations

---

## 🔗 Key Relationships

### **Primary Keys:**
```
employees.employee_id (PK) ←→ attendance.employee_id (FK)
```

### **Join Operations:**
```javascript
// Department Stats menggunakan $lookup
attendance.employee_id → employees.employee_id
  ↓
employees.department (untuk grouping)
```

---

## 📊 Key Usage Summary

### **Most Used Keys:**

| Key | Usage Count | Features |
|-----|-------------|----------|
| `date` | 8 features | All analytics features |
| `checkin` | 7 features | Total, Late, Compliance, Trend, Departments, Monthly, AI |
| `checkin.status` | 2 features | Late Arrivals, AI Insights |
| `work_duration_minutes` | 2 features | Working Duration, AI Insights |
| `employee_id` | 2 features | Departments (join), AI Insights |
| `department` | 2 features | Departments, AI Insights |
| `is_active` | 2 features | Compliance, AI Insights |
| `totalEmployees` (derived) | 3 features | Attendance Trend (Y-axis), Top Departments (Y-axis), Monthly Check-ins (color thresholds) |

### **Critical Keys:**
✅ **`date`** - String format YYYY-MM-DD (used in ALL queries)  
✅ **`checkin`** - Object, must exist untuk semua attendance records  
✅ **`checkin.status`** - Enum: "ontime" | "late" (calculated at check-in)  
✅ **`work_duration_minutes`** - Integer (calculated at check-out)  
✅ **`totalEmployees`** - Derived from `employees.count_documents({'is_active': True})`, used for dynamic scaling

### **Dynamic Range Features (New in v4.0):**
All chart ranges now auto-scale based on `totalEmployees`:
- **Attendance Trend (Line Chart):** Y-axis = `totalEmployees * 1.2`, rounded to 10
- **Top Departments (Bar Chart):** Y-axis = `totalEmployees * 1.2`, rounded to 10
- **Monthly Check-ins (Heatmap):** Color thresholds = 80%, 55%, 35%, 15% of `totalEmployees`  

---

## 🎯 Index Recommendations

Untuk optimize query performance, create indexes:

```javascript
// Attendance collection
db.attendance.createIndex({ "date": 1 })
db.attendance.createIndex({ "employee_id": 1 })
db.attendance.createIndex({ "date": 1, "employee_id": 1 })
db.attendance.createIndex({ "checkin.status": 1 })
db.attendance.createIndex({ "checkin.timestamp": 1 })

// Employees collection
db.employees.createIndex({ "employee_id": 1 }, { unique: true })
db.employees.createIndex({ "department": 1 })
db.employees.createIndex({ "is_active": 1 })
```

---

## ✅ Validation Checklist

### **Required Fields (Must Exist):**
- [x] `attendance.date` - String YYYY-MM-DD
- [x] `attendance.employee_id` - String
- [x] `attendance.checkin` - Object
- [x] `attendance.checkin.status` - String ("ontime" or "late")
- [x] `attendance.checkin.timestamp` - String ISO format

### **Optional Fields:**
- [ ] `attendance.checkout` - Object (null until check-out)
- [ ] `attendance.work_duration_minutes` - Integer (0 until check-out)

### **Employee Fields:**
- [x] `employees.employee_id` - String (unique)
- [x] `employees.name` - String
- [x] `employees.department` - String
- [x] `employees.is_active` - Boolean

---

## 🔧 Key Calculation Logic

### **1. checkin.status**
```python
# Calculated during check-in
work_start_time = datetime.now().replace(hour=9, minute=0, second=0)
status = 'late' if datetime.now() > work_start_time else 'ontime'
```

### **2. work_duration_minutes**
```python
# Calculated during check-out
checkin_time = datetime.fromisoformat(record['checkin']['timestamp'])
checkout_time = datetime.now()
work_duration_minutes = int((checkout_time - checkin_time).total_seconds() / 60)
```

### **3. date**
```python
# Set during check-in
date = datetime.now().strftime('%Y-%m-%d')
```

---

## 🆕 Changelog

### **Version 4.0** (5 November 2025)
- ✅ Replaced Hourly Check-ins with Monthly Check-ins (calendar view)
- ✅ Added dynamic ranges for all charts based on `totalEmployees`
- ✅ Monthly check-ins: 28-31 days dynamic handling with `calendar.monthrange()`
- ✅ Color thresholds: 80%, 55%, 35%, 15% of total employees
- ✅ Updated Quick Reference Table with dynamic features

### **Version 3.0** (4 November 2025)
- ✅ Hybrid AI Insights implementation
- ✅ AI now analyzes database + 5 dashboard stat sources
- ✅ Enhanced prompt for specific recommendations

### **Version 2.0** (4 November 2025)
- ✅ Initial comprehensive documentation
- ✅ All 8 features documented with MongoDB keys
- ✅ Query examples and field mappings

---

**Generated:** 5 November 2025  
**Version:** 4.0 (Monthly Check-ins + Dynamic Ranges)  
**Total Keys Documented:** 14 attendance keys + 5 employee keys + 1 derived key (`totalEmployees`)
