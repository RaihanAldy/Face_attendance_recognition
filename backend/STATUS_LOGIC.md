# 🕒 Attendance Status Logic

**Updated:** November 6, 2025

---

## 📋 Check-in Status (3 levels)

| Status | Condition | Time Range | Description |
|--------|-----------|------------|-------------|
| **early** 🌅 | `now < 7:00 AM` | Before 7:00 AM | Check-in terlalu pagi |
| **ontime** ✅ | `7:00 AM ≤ now ≤ 9:00 AM` | 7:00 - 9:00 AM | Check-in tepat waktu |
| **late** ⏰ | `now > 9:00 AM` | After 9:00 AM | Check-in terlambat |

### Code Implementation:
```python
early_time = now.replace(hour=7, minute=0, second=0, microsecond=0)
work_start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)

if now < early_time:
    status = 'early'  # < 7:00 AM
elif now <= work_start_time:
    status = 'ontime'  # 7:00 - 9:00 AM
else:
    status = 'late'  # > 9:00 AM
```

---

## 📋 Check-out Status (3 levels)

| Status | Condition | Work Hours | Description |
|--------|-----------|------------|-------------|
| **early** 🏃 | `work_hours < 8` | < 8 hours | Check-out terlalu cepat / pulang cepat |
| **ontime** ✅ | `8 ≤ work_hours ≤ 10` | 8 - 10 hours | Check-out normal |
| **late** 🌙 | `work_hours > 10` | > 10 hours | Check-out overtime / lembur |

### Code Implementation:
```python
work_duration = int((now - checkin_time).total_seconds() / 60)
work_hours = work_duration / 60

if work_hours < 8:
    checkout_status = 'early'  # < 8 hours
elif work_hours <= 10:
    checkout_status = 'ontime'  # 8-10 hours
else:
    checkout_status = 'late'  # > 10 hours (overtime)
```

---

## 🔄 Duplicate Check-in Prevention

**Parameter:** `allow_duplicate` (default: `True`)

### Testing Mode (allow_duplicate=True):
```python
db_manager.record_attendance('EMP-001', attendance_type='check_in', allow_duplicate=True)
```
- ✅ Allow multiple check-ins per day
- ✅ Update existing record with new timestamp
- ✅ Good for testing face recognition

### Production Mode (allow_duplicate=False):
```python
db_manager.record_attendance('EMP-001', attendance_type='check_in', allow_duplicate=False)
```
- ❌ Prevent duplicate check-ins
- ⚠️ Return None if already checked in today
- ✅ Clean data for analytics

---

## 📊 Database Structure

```json
{
  "date": "2025-11-06",
  "employee_id": "EMP-003",
  "employee_name": "Raihan Jan'smaillendra Suryono",
  "checkin": {
    "status": "early" | "ontime" | "late",
    "timestamp": "2025-11-06T13:23:35.391128"
  },
  "checkout": {
    "status": "early" | "ontime" | "late",
    "timestamp": "2025-11-06T13:27:39.543375"
  },
  "work_duration_minutes": 244,
  "createdAt": "2025-11-06T13:23:35.391Z",
  "updatedAt": "2025-11-06T13:27:39.543Z"
}
```

---

## 🎯 Use Cases

### Example 1: Early Bird
```
Check-in: 6:30 AM → status: "early"
Check-out: 2:30 PM → work_hours: 8h → status: "ontime"
```

### Example 2: On-Time Worker
```
Check-in: 8:00 AM → status: "ontime"
Check-out: 5:00 PM → work_hours: 9h → status: "ontime"
```

### Example 3: Late Arrival
```
Check-in: 9:30 AM → status: "late"
Check-out: 5:30 PM → work_hours: 8h → status: "ontime"
```

### Example 4: Overtime
```
Check-in: 8:00 AM → status: "ontime"
Check-out: 8:00 PM → work_hours: 12h → status: "late" (overtime)
```

### Example 5: Early Leave
```
Check-in: 8:00 AM → status: "ontime"
Check-out: 3:00 PM → work_hours: 7h → status: "early"
```

---

## ⚙️ Configuration

Current thresholds (can be customized):

**Check-in:**
- Early threshold: **7:00 AM**
- Late threshold: **9:00 AM**

**Check-out:**
- Early threshold: **8 hours**
- Late (overtime) threshold: **10 hours**

To modify, edit `mongo_db.py` lines:
- Check-in: Line ~93-103
- Check-out: Line ~157-167

---

**File:** `backend/mongo_db.py`  
**Function:** `record_attendance()`
