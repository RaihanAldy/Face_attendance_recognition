# 📊 Dashboard Features - Database Mapping

**Tanggal:** 4 November 2025  
**Database:** MongoDB  
**Collections:** `attendance`, `employees`

---

## 🗄️ Database Structure

### Collection: `attendance`
```javascript
{
  _id: ObjectId,
  date: "2025-11-04",                    // String format YYYY-MM-DD
  employee_id: "E001",                   
  employee_name: "John Doe",             
  checkin: {
    status: "ontime" | "late",           // Late jika > 09:00
    timestamp: "2025-11-04T08:30:00"     // ISO format string
  },
  checkout: {
    status: "ontime",                    
    timestamp: "2025-11-04T17:30:00"     // ISO format string atau null
  },
  work_duration_minutes: 540,            // Integer (dihitung saat checkout)
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Collection: `employees`
```javascript
{
  _id: ObjectId,
  employee_id: "E001",                   // Unique ID
  name: "John Doe",
  department: "Engineering",
  is_active: true,
  created_at: ISODate
}
```

---

## 📈 Dashboard Features Mapping

### 1. **Summary Cards (Top Section)**
**Endpoint:** `/api/analytics/summary`  
**Auto-refresh:** Setiap 5 menit

| Card | Database Query | Collections | Fields Used |
|------|----------------|-------------|-------------|
| **Total Attendance** | `attendance.count_documents({'date': today, 'checkin': {$exists: true}})` | `attendance` | `date`, `checkin` |
| **Late Arrivals** | `attendance.count_documents({'date': today, 'checkin.status': 'late'})` | `attendance` | `date`, `checkin.status` |
| **Compliance Rate** | `(total_today / total_employees) * 100` | `attendance`, `employees` | `date`, `is_active` |

**Query Detail:**
```python
# Total Attendance Today
total_today = db.attendance.count_documents({
    'date': '2025-11-04',
    'checkin': {'$exists': True}
})

# Late Arrivals
late_count = db.attendance.count_documents({
    'date': '2025-11-04',
    'checkin.status': 'late'
})

# Total Active Employees
total_employees = db.employees.count_documents({'is_active': True})

# Compliance %
compliance = (total_today / total_employees * 100)
```

---

### 2. **Average Working Duration Card**
**Endpoint:** `/api/analytics/working-duration`  
**Auto-refresh:** Setiap 5 menit

| Metric | Database Query | Fields Used |
|--------|----------------|-------------|
| **Average Duration** | Average of `work_duration_minutes / 60` | `date`, `work_duration_minutes` |
| **Longest Duration** | Max of `work_duration_minutes / 60` | `work_duration_minutes` |
| **Shortest Duration** | Min of `work_duration_minutes / 60` | `work_duration_minutes` |

**Query Detail:**
```python
# Get all records today with duration
attendance_records = db.attendance.find({
    'date': '2025-11-04',
    'work_duration_minutes': {'$exists': True, '$gt': 0}
})

# Calculate metrics (convert minutes to hours)
durations_hours = [record['work_duration_minutes'] / 60 for record in attendance_records]
average = sum(durations_hours) / len(durations_hours)
longest = max(durations_hours)
shortest = min(durations_hours)
```

**Real-Time Flow:**
```
Employee Check-Out → record_attendance('check_out') 
→ Calculate: work_duration_minutes = (checkout - checkin) / 60
→ Update MongoDB → Dashboard refresh (5 min) → Display!
```

---

### 3. **Attendance Trend Chart (7 Days)**
**Endpoint:** `/api/analytics/attendance-trend`  
**Auto-refresh:** Setiap 5 menit

| Data | Database Query | Fields Used |
|------|----------------|-------------|
| **Monday-Sunday Count** | Count per date (7 days) | `date`, `checkin` |

**Query Detail:**
```python
# Loop untuk 7 hari (Senin - Minggu)
for i in range(7):
    date_str = (monday + timedelta(days=i)).strftime('%Y-%m-%d')
    
    count = db.attendance.count_documents({
        'date': date_str,
        'checkin': {'$exists': True}
    })
    
    result.append({
        'day': 'Mon/Tue/Wed/Thu/Fri/Sat/Sun',
        'count': count,
        'date': date_str
    })
```

**Chart Range:** Y-axis 0-75 (matching heatmap scale)

---

### 4. **Top Departments by Attendance (Donut Chart)**
**Endpoint:** `/api/analytics/departments`  
**Auto-refresh:** Setiap 5 menit

| Data | Database Query | Collections | Fields Used |
|------|----------------|-------------|-------------|
| **Top 5 Departments** | Aggregation + $lookup | `attendance`, `employees` | `date`, `checkin`, `employee_id`, `department` |

**Query Detail:**
```python
pipeline = [
    # 1. Filter attendance hari ini
    {'$match': {
        'date': '2025-11-04',
        'checkin': {'$exists': True}
    }},
    
    # 2. Join dengan employees collection
    {'$lookup': {
        'from': 'employees',
        'localField': 'employee_id',
        'foreignField': 'employee_id',
        'as': 'employee'
    }},
    
    # 3. Unwind hasil join
    {'$unwind': '$employee'},
    
    # 4. Group by department
    {'$group': {
        '_id': '$employee.department',
        'count': {'$sum': 1}
    }},
    
    # 5. Sort descending
    {'$sort': {'count': -1}},
    
    # 6. Top 5 only
    {'$limit': 5}
]

results = db.attendance.aggregate(pipeline)
```

---

### 5. **Hourly Check-In Activity (Heatmap)**
**Endpoint:** `/api/analytics/hourly-checkins`  
**Auto-refresh:** Setiap 5 menit

| Data | Database Query | Fields Used |
|------|----------------|-------------|
| **24 Hours Distribution** | Group by hour from `checkin.timestamp` | `date`, `checkin.timestamp` |

**Query Detail:**
```python
pipeline = [
    # 1. Filter by date
    {'$match': {
        'date': '2025-11-04',
        'checkin': {'$exists': True},
        'checkin.timestamp': {'$exists': True}
    }},
    
    # 2. Extract hour from ISO timestamp
    {'$project': {
        'hour': {
            '$hour': {
                '$dateFromString': {
                    'dateString': '$checkin.timestamp'
                }
            }
        }
    }},
    
    # 3. Group by hour
    {'$group': {
        '_id': '$hour',
        'count': {'$sum': 1}
    }},
    
    # 4. Sort by hour
    {'$sort': {'_id': 1}}
]

# Create 24-hour array (00-23)
hourly_data = [{'hour': f'{i:02d}', 'checkIns': 0} for i in range(24)]

# Fill dengan hasil query
for item in results:
    hourly_data[item['_id']]['checkIns'] = item['count']
```

**Output:** Array 24 elemen (jam 00-23) dengan jumlah check-in per jam

---

### 6. **Employee Ranking (Top Performers)**
**Endpoint:** `/api/analytics/departments` (reused)  
**Auto-refresh:** Setiap 5 menit

**Note:** Saat ini menggunakan endpoint yang sama dengan Top Departments. Jika ingin ranking individual employee, perlu endpoint terpisah.

---

### 7. **AI Insights Summary**
**Endpoint:** `/api/analytics/ai-insights`  
**Auto-refresh:** Setiap hari jam 00:00 + localStorage cache

| Data Source | Database Query | Collections | Fields Used |
|-------------|----------------|-------------|-------------|
| **Attendance Patterns** | 7 days attendance data | `attendance` | `date`, `checkin`, `checkin.status`, `work_duration_minutes` |
| **Employee Data** | All active employees | `employees` | `employee_id`, `name`, `department`, `is_active` |

**Query Detail:**
```python
# 1. Get date range (last 7 days)
end_date = datetime.now()
start_date = end_date - timedelta(days=7)

# 2. Query attendance data
attendance_data = db.attendance.find({
    'date': {
        '$gte': start_date.strftime('%Y-%m-%d'),
        '$lte': end_date.strftime('%Y-%m-%d')
    },
    'checkin': {'$exists': True}
})

# 3. Analyze patterns
late_count = sum(1 for r in attendance_data if r.get('checkin', {}).get('status') == 'late')
avg_duration = avg([r['work_duration_minutes'] for r in attendance_data if r.get('work_duration_minutes', 0) > 0])

# 4. Send to Elice OpenAI API
insights = generate_insights(attendance_summary)
```

**Dependencies:**
- Elice API Key (expires daily at 23:59:59)
- Located in: `backend/.env` → `OPENAI_API_KEY`

---

## 🔄 Real-Time Data Flow

### **Check-In Flow:**
```
1. Employee Scan Face
2. Face Recognition → Identify employee_id
3. Call: mongo_db.record_attendance(employee_id, confidence, 'check_in')
4. MongoDB Insert:
   {
     date: "2025-11-04",
     employee_id: "E001",
     checkin: {status: "late/ontime", timestamp: now},
     checkout: null,
     work_duration_minutes: 0
   }
5. Dashboard auto-refresh (5 min) → Show updated data
```

### **Check-Out Flow:**
```
1. Employee Scan Face  
2. Face Recognition → Identify employee_id
3. Call: mongo_db.record_attendance(employee_id, confidence, 'check_out')
4. MongoDB Update:
   - Add: checkout: {status: "ontime", timestamp: now}
   - Calculate: work_duration_minutes = (checkout - checkin) / 60
   - Update: updatedAt = now
5. Dashboard auto-refresh (5 min) → Show working duration
```

---

## ⚙️ Auto-Refresh Settings

| Feature | Refresh Interval | Method |
|---------|-----------------|--------|
| **All Analytics** | 5 minutes | `useEffect` dengan `setInterval(300000)` |
| **AI Insights** | Daily (00:00) | localStorage cache + midnight check |
| **Attendance Logs** | 5 minutes | Table auto-refresh |

**File:** `frontend/src/page/Analytics.jsx`
```javascript
useEffect(() => {
  fetchAllData();
  const interval = setInterval(fetchAllData, 300000); // 5 min
  return () => clearInterval(interval);
}, []);
```

---

## 📋 Summary Table

| Dashboard Feature | Endpoint | Collections | Key Fields | Refresh |
|-------------------|----------|-------------|------------|---------|
| Total Attendance | `/api/analytics/summary` | `attendance` | `date`, `checkin` | 5 min |
| Late Arrivals | `/api/analytics/summary` | `attendance` | `date`, `checkin.status` | 5 min |
| Compliance Rate | `/api/analytics/summary` | `attendance`, `employees` | `date`, `is_active` | 5 min |
| Working Duration | `/api/analytics/working-duration` | `attendance` | `date`, `work_duration_minutes` | 5 min |
| Attendance Trend | `/api/analytics/attendance-trend` | `attendance` | `date`, `checkin` | 5 min |
| Top Departments | `/api/analytics/departments` | `attendance`, `employees` | `date`, `checkin`, `employee_id`, `department` | 5 min |
| Hourly Check-In | `/api/analytics/hourly-checkins` | `attendance` | `date`, `checkin.timestamp` | 5 min |
| AI Insights | `/api/analytics/ai-insights` | `attendance`, `employees` | All fields | Daily |

---

## ✅ Verification Checklist

- [x] **Database Structure:** Unified document per employee per day
- [x] **Check-In Logic:** Auto-calculate late/ontime status (09:00 threshold)
- [x] **Check-Out Logic:** Auto-calculate work_duration_minutes
- [x] **All Endpoints:** Updated to use new structure (date, checkin, checkout)
- [x] **Real-Time Updates:** All features query MongoDB directly
- [x] **Auto-Refresh:** Dashboard refreshes every 5 minutes
- [x] **AI Insights:** Daily refresh with Elice API integration

---

## 🔧 Maintenance Notes

### **Daily Tasks:**
1. **Update Elice API Key** (expires 23:59:59 daily)
   - Generate new key from Elice Dashboard
   - Update in `backend/.env` → `OPENAI_API_KEY`
   - Restart backend: `flask run` or PM2 restart

### **Monitoring:**
- Check MongoDB connection health
- Verify attendance records have required fields
- Monitor API response times (<500ms recommended)
- Check AI Insights generation success rate

### **Troubleshooting:**
- **Empty dashboard:** Check if attendance collection has data for today's date
- **Working duration = 0:** Verify employees have checked out (checkout field exists)
- **AI Insights error:** Check Elice API key validity and expiration
- **Departments empty:** Verify employees collection has department field

---

**Generated:** 4 November 2025  
**Version:** 2.0 (New Structure)  
**Last Updated:** After record_attendance() rewrite
