# 🚀 Setup AI Insights dengan Elice API

## 📋 Overview

Elice menyediakan OpenAI-compatible proxy yang bisa digunakan untuk AI Insights. Sistem sudah dikonfigurasi untuk support custom base_url.

## ⚡ Quick Setup (3 Steps)

### Step 1: Install OpenAI Library

```powershell
cd backend
pip install openai
```

### Step 2: Update .env File

Edit `backend/.env` dan ganti dengan credentials Elice kamu:

```env
# OpenAI Proxy (Elice)
OPENAI_BASE_URL=https://mlapi.run/your-actual-endpoint/v1
OPENAI_API_KEY=your-actual-elice-api-key
OPENAI_MODEL=openai/gpt-4o
```

**⚠️ PENTING:**
- Ganti `https://mlapi.run/abc-1234-xyz/v1` dengan endpoint sebenarnya dari Elice
- Ganti `your-elice-api-key-here` dengan API key yang kamu dapat
- Model bisa `openai/gpt-4o` atau `openai/gpt-5` (tergantung yang disupport)

### Step 3: Test API

```powershell
cd backend
python
```

```python
from ai_insights import AIInsightsGenerator

# Test connection
ai = AIInsightsGenerator(ai_provider="openai")

# Test dengan dummy data
test_attendance = [
    {'employee_id': '1', 'action': 'check-in', 'timestamp': '2025-11-03T08:30:00'},
    {'employee_id': '2', 'action': 'check-in', 'timestamp': '2025-11-03T09:15:00'}
]
test_employees = [
    {'_id': '1', 'name': 'John', 'is_active': True},
    {'_id': '2', 'name': 'Jane', 'is_active': True}
]

insights = ai.generate_insights(test_attendance, test_employees)
print(insights)
```

Jika berhasil, kamu akan lihat:
```
✅ OpenAI client initialized with custom proxy: https://mlapi.run/...
```

## 🎯 Cara Kerja

### 1. Backend akan otomatis detect custom base_url:

```python
# Dari ai_insights.py
if os.getenv("OPENAI_BASE_URL"):
    # Using Elice proxy
    client = OpenAI(
        base_url="https://mlapi.run/your-endpoint/v1",
        api_key="your-api-key"
    )
else:
    # Using official OpenAI API
    client = OpenAI(api_key="sk-...")
```

### 2. Model Configuration:

Elice support beberapa model:
- `openai/gpt-4o` (recommended)
- `openai/gpt-5` (jika tersedia)

Set di `.env`:
```env
OPENAI_MODEL=openai/gpt-4o
```

### 3. API Calls:

Setiap request akan otomatis menggunakan Elice proxy:

```python
response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[...],
    temperature=0.7,
    max_tokens=500
)
```

## 📊 Test Endpoint

### Via Terminal:

```powershell
# Start backend
cd backend
python app.py
```

### Via Browser/Postman:

```
GET http://localhost:5000/api/analytics/ai-insights?days=7
```

Expected response:
```json
{
  "success": true,
  "provider": "openai",
  "data_range": "7 days",
  "insights": {
    "summary": "Current attendance rate is 92.5%...",
    "key_findings": [
      "Engineering department shows highest attendance",
      "Late arrivals decreased by 15%",
      "Friday attendance dips slightly"
    ]
  }
}
```

## 🔧 Troubleshooting

### Error: "Authentication failed"

```env
# Check API key format
OPENAI_API_KEY=pk_proxy_xxxxx  # atau format lain dari Elice
```

### Error: "Invalid base_url"

```env
# Pastikan endpoint lengkap dengan /v1
OPENAI_BASE_URL=https://mlapi.run/abc-1234-xyz/v1
                                                   ^^^
                                                   penting!
```

### Error: "Model not found"

```env
# Try different model name
OPENAI_MODEL=openai/gpt-4o      # recommended
# atau
OPENAI_MODEL=openai/gpt-5       # jika tersedia
```

### API returns error 401/403

1. Verify API key valid
2. Check apakah ada rate limit
3. Confirm endpoint URL benar

### Test connection directly:

```python
from openai import OpenAI
import os

client = OpenAI(
    base_url=os.getenv("OPENAI_BASE_URL"),
    api_key=os.getenv("OPENAI_API_KEY")
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

## 💡 Features Supported

✅ **Non-streaming responses** (default)
✅ **Streaming responses** (untuk real-time)
✅ **Structured output** (dengan Pydantic)
✅ **Error handling** (automatic retry)
✅ **Fallback system** (jika API down)

## 🎨 Frontend Integration

Frontend akan otomatis fetch dari endpoint:

```javascript
// Di AIInsightSummary.jsx
fetch('http://localhost:5000/api/analytics/ai-insights?days=7')
  .then(res => res.json())
  .then(data => {
    // Display insights
    setSummary(data.insights.summary)
    setKeyFindings(data.insights.key_findings)
  })
```

## 📈 Production Tips

### 1. Environment Variables:

```env
# Development
OPENAI_BASE_URL=https://mlapi.run/dev-endpoint/v1

# Production
OPENAI_BASE_URL=https://mlapi.run/prod-endpoint/v1
```

### 2. Rate Limits:

Check dengan Elice untuk limits:
- Requests per minute
- Tokens per minute
- Concurrent requests

### 3. Error Handling:

Sistem sudah built-in fallback:
- Jika Elice API error → automatic fallback ke rule-based insights
- User tetap dapat insights (meski tidak dari AI)

### 4. Monitoring:

Check logs untuk usage:
```python
print("🤖 Generating AI insights...")  # di ai_insights.py
print(f"✅ AI insights loaded")         # di console
```

## 🔒 Security

```env
# .env file (JANGAN commit ke git!)
OPENAI_API_KEY=your-secret-key

# .gitignore (pastikan ada)
.env
*.pyc
__pycache__/
```

## 📞 Support

Jika ada masalah:

1. **Check logs**: `python app.py` dan lihat error message
2. **Test connection**: Gunakan script test di atas
3. **Verify credentials**: Pastikan base_url dan API key benar
4. **Check Elice docs**: https://elice.io atau dashboard Elice

## ✅ Checklist Setup

- [ ] Install `pip install openai`
- [ ] Update `.env` dengan credentials Elice
- [ ] Test connection dengan script Python
- [ ] Start backend: `python app.py`
- [ ] Test endpoint: `http://localhost:5000/api/analytics/ai-insights`
- [ ] Check frontend dashboard untuk AI Insights box
- [ ] Monitor logs untuk errors

## 🎯 Next Steps

Setelah setup berhasil:

1. ✅ AI Insights akan muncul di dashboard
2. 🔄 Auto-refresh setiap kali data berubah
3. 📊 Summary dan Key Findings real-time
4. 💡 Actionable insights dari attendance data

---

**Need Help?** Tunjukkan error message yang muncul dan saya akan bantu troubleshoot! 🚀
