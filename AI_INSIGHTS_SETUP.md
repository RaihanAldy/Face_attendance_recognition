# AI Insights Setup Guide

**Last Updated:** 4 November 2025 - Version 2.1  
**Refresh Schedule:** Daily at 23:00 (11 PM) - before API key expires at midnight

## 📋 Overview
Sistem AI Insights menggunakan AI untuk menganalisis data attendance dan employee, kemudian menghasilkan summary dan key findings yang actionable.

## ⏰ **NEW: 11 PM Daily Refresh (Opsi A)**

**Why 11 PM (23:00)?**
- ✅ **API Key Still Valid** - Elice key expires at 23:59:59 (midnight)
- ✅ **95%+ Data Complete** - Most employees checked out by 11 PM
- ✅ **Fully Automated** - No manual intervention needed
- ✅ **Today's Performance** - Real snapshot of today's work
- ✅ **No Missing Overtime** - Late workers mostly finished by 11 PM

**Summary Format:**
```
"Today's attendance rate is 75.0% with 3 out of 4 employees checked in (as of 11 PM)"
"Average working hours: 9.2 hours (most employees checked out)"
```

**Why Not 5 AM?**
- ❌ API key expires at midnight (00:00)
- ❌ Would need manual key update every morning
- ❌ Or need automation script (complex)
- ✅ 11 PM = API key valid + data nearly complete

**Trade-off:**
- ⚠️ 5% data might be incomplete (employees working past 11 PM)
- ✅ But fully automated, no maintenance required

## 🎯 Supported AI Providers

1. **OpenAI** (GPT-4o-mini) - Recommended ✅
   - Paling akurat dan reliable
   - Cost: ~$0.15-0.60 per 1M tokens
   - Speed: Fast

2. **Anthropic** (Claude 3 Haiku)
   - Sangat cepat dan murah
   - Cost: ~$0.25-1.25 per 1M tokens
   - Speed: Very Fast

3. **Google AI** (Gemini Pro)
   - Free tier generous
   - Cost: Free untuk penggunaan moderat
   - Speed: Fast

4. **Groq** (LLaMA 3.1)
   - Tercepat
   - Cost: Free beta
   - Speed: Extremely Fast

## 🚀 Quick Setup

### Step 1: Install AI Library

Pilih salah satu atau beberapa:

```bash
# OpenAI (Recommended)
pip install openai

# Anthropic
pip install anthropic

# Google AI
pip install google-generativeai

# Groq
pip install groq
```

### Step 2: Set API Key

Buat file `.env` di folder `backend/`:

```bash
# Copy dari template
cp .env.example .env
```

Edit `.env` dan tambahkan API key:

```env
# Untuk OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Atau Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Atau Google
GOOGLE_API_KEY=xxxxxxxxxxxxx

# Atau Groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### Step 3: Get API Key

#### OpenAI:
1. Buka https://platform.openai.com/api-keys
2. Create new secret key
3. Copy dan paste ke `.env`
4. Add credit ($5-10 recommended)

#### Anthropic:
1. Buka https://console.anthropic.com/settings/keys
2. Create key
3. Copy ke `.env`

#### Google AI:
1. Buka https://makersuite.google.com/app/apikey
2. Create API key
3. Copy ke `.env`

#### Groq:
1. Buka https://console.groq.com/keys
2. Create API key (FREE)
3. Copy ke `.env`

### Step 4: Test API

```bash
cd backend
python
```

```python
from ai_insights import AIInsightsGenerator

# Test dengan provider pilihan
ai = AIInsightsGenerator(ai_provider="openai")  # atau "anthropic", "google", "groq"

# Test data
test_attendance = [
    {'employee_id': '1', 'action': 'check-in', 'timestamp': '2025-11-03T08:30:00'},
    {'employee_id': '2', 'action': 'check-in', 'timestamp': '2025-11-03T09:15:00'}
]
test_employees = [
    {'_id': '1', 'name': 'John', 'department': 'Engineering', 'is_active': True},
    {'_id': '2', 'name': 'Jane', 'department': 'Marketing', 'is_active': True}
]

# Generate insights
insights = ai.generate_insights(test_attendance, test_employees)
print(insights)
```

## 🔧 Configuration

### Change AI Provider in Runtime

Frontend bisa memilih provider via query parameter:

```javascript
// Default (OpenAI)
fetch('/api/analytics/ai-insights')

// Specific provider
fetch('/api/analytics/ai-insights?provider=anthropic')
fetch('/api/analytics/ai-insights?provider=google')
fetch('/api/analytics/ai-insights?provider=groq')
```

### Change Time Range

```javascript
// Last 7 days (default)
fetch('/api/analytics/ai-insights?days=7')

// Last 30 days
fetch('/api/analytics/ai-insights?days=30')

// Last 90 days
fetch('/api/analytics/ai-insights?days=90')
```

## 📊 API Response Format

```json
{
  "success": true,
  "provider": "openai",
  "data_range": "7 days",
  "insights": {
    "summary": "Current attendance rate is 92.5% with excellent punctuality across all departments.",
    "key_findings": [
      "Engineering department shows highest attendance at 98%",
      "Late arrivals decreased by 15% compared to last week",
      "Friday attendance dips slightly to 88% - consider flexible schedules"
    ]
  },
  "stats": {
    "total_records": 156,
    "total_employees": 45,
    "generated_at": "2025-11-03T15:30:00"
  }
}
```

## 🛡️ Fallback System

Jika AI tidak tersedia (no API key, network error, dll), sistem otomatis menggunakan **rule-based insights**:

```python
# Fallback logic:
- Attendance rate calculation
- Late arrival detection
- Working hours analysis
- Department performance
- Weekly trends
```

## 💰 Cost Estimation

### OpenAI (GPT-4o-mini)
- Per request: ~500-1000 tokens
- Cost per request: $0.0001 - $0.0003
- 1000 requests: ~$0.10 - $0.30

### Anthropic (Claude Haiku)
- Per request: ~500-1000 tokens
- Cost per request: $0.0001 - $0.0006
- 1000 requests: ~$0.10 - $0.60

### Google AI (Gemini)
- Free tier: 60 requests/minute
- Cost: FREE untuk penggunaan normal

### Groq
- Currently FREE (beta)
- Fastest inference

## 🔍 Troubleshooting

### Error: "AI insights module not configured"
```bash
# Install library yang sesuai
pip install openai
# atau
pip install anthropic
```

### Error: "Authentication failed"
```bash
# Check API key di .env
cat backend/.env

# Pastikan format benar:
OPENAI_API_KEY=sk-proj-... (harus diawali sk-proj- atau sk-)
ANTHROPIC_API_KEY=sk-ant-...
```

### Error: "Rate limit exceeded"
```python
# Reduce request frequency atau upgrade plan
# Atau switch ke provider lain:
fetch('/api/analytics/ai-insights?provider=groq')  # FREE & fast
```

### AI returns generic insights
```python
# Check data yang dikirim cukup
# Minimum: 10+ attendance records
# Ensure timestamps valid
# Verify employee data lengkap
```

## 🎨 Frontend Integration

Update `Analytics.jsx`:

```jsx
import AIInsightSummary from '../components/charts/AIInsightSummary';

function Analytics() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Other charts */}
      <AIInsightSummary refreshTrigger={refreshCount} />
    </div>
  );
}
```

## 🚀 Performance Tips

1. **Cache insights** - AI insights bisa di-cache 30 menit
2. **Lazy loading** - Load AI insights terakhir
3. **Background refresh** - Update setiap 1-2 jam
4. **Use Groq** - Jika butuh speed maksimal (FREE!)

## 📈 Next Steps

1. ✅ Setup API key
2. ✅ Test endpoint
3. ✅ View di dashboard
4. 🔄 Monitor usage & costs
5. 🎯 Fine-tune prompts untuk hasil lebih baik

## 🆘 Support

Jika ada masalah:
1. Check logs: `python app.py` dan lihat console
2. Test API: `curl http://localhost:5000/api/analytics/ai-insights`
3. Verify API key valid
4. Try different provider

---

**Recommendation:** Start dengan **Groq** (FREE & fastest) atau **Google AI** (FREE tier generous) untuk testing, kemudian upgrade ke **OpenAI** untuk production quality.
