"""
AI Insights Generator for Attendance System
Generates intelligent summaries and key findings from attendance data
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIInsightsGenerator:
    def __init__(self, ai_provider="openai", api_key=None):
        """
        Initialize AI Insights Generator
        
        Args:
            ai_provider: "openai", "anthropic", "google", or "groq"
            api_key: API key for the selected provider
        """
        self.ai_provider = ai_provider.lower()
        self.api_key = api_key or os.getenv(f"{ai_provider.upper()}_API_KEY")
        
        if not self.api_key:
            print(f"⚠️  Warning: No API key found for {ai_provider}")
        
        # Initialize the appropriate AI client
        self._init_ai_client()
    
    def _init_ai_client(self):
        """Initialize AI client based on provider"""
        try:
            if self.ai_provider == "openai":
                from openai import OpenAI
                
                # Support custom base_url for proxies like Elice
                base_url = os.getenv("OPENAI_BASE_URL")
                
                if base_url:
                    # Using custom proxy (e.g., Elice)
                    self.client = OpenAI(
                        base_url=base_url,
                        api_key=self.api_key
                    )
                    self.model = os.getenv("OPENAI_MODEL", "openai/gpt-4o")
                    print(f"✅ OpenAI client initialized with custom proxy: {base_url}")
                else:
                    # Using official OpenAI API
                    self.client = OpenAI(api_key=self.api_key)
                    self.model = "gpt-4o-mini"
                    print("✅ OpenAI client initialized")
                
            elif self.ai_provider == "anthropic":
                from anthropic import Anthropic
                self.client = Anthropic(api_key=self.api_key)
                self.model = "claude-3-haiku-20240307"  # Fast & cheap
                print("✅ Anthropic client initialized")
                
            elif self.ai_provider == "google":
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel('gemini-pro')
                self.model = "gemini-pro"
                print("✅ Google AI client initialized")
                
            elif self.ai_provider == "groq":
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
                self.model = "llama-3.1-8b-instant"  # Fast inference
                print("✅ Groq client initialized")
                
            else:
                print(f"❌ Unsupported AI provider: {self.ai_provider}")
                self.client = None
                
        except ImportError as e:
            print(f"❌ Failed to import {self.ai_provider} library: {e}")
            print(f"💡 Install with: pip install {self._get_package_name()}")
            self.client = None
        except Exception as e:
            print(f"❌ Failed to initialize AI client: {e}")
            self.client = None
    
    def _get_package_name(self):
        """Get package name for pip install"""
        packages = {
            "openai": "openai",
            "anthropic": "anthropic",
            "google": "google-generativeai",
            "groq": "groq"
        }
        return packages.get(self.ai_provider, self.ai_provider)
    
    def generate_insights(self, attendance_data: List[Dict], employee_data: List[Dict], dashboard_stats: Dict = None) -> Dict[str, Any]:
        """
        Generate AI insights from attendance and employee data + dashboard statistics
        
        Args:
            attendance_data: List of attendance records
            employee_data: List of employee records
            dashboard_stats: Optional dict with pre-calculated dashboard analytics
            
        Returns:
            Dict with summary and key_findings
        """
        if not self.client:
            return self._fallback_insights(attendance_data, employee_data, dashboard_stats)
        
        try:
            # Prepare data summary for AI (with dashboard context)
            data_summary = self._prepare_data_summary(attendance_data, employee_data, dashboard_stats)
            
            # Generate insights using AI
            if self.ai_provider == "openai":
                return self._generate_openai_insights(data_summary)
            elif self.ai_provider == "anthropic":
                return self._generate_anthropic_insights(data_summary)
            elif self.ai_provider == "google":
                return self._generate_google_insights(data_summary)
            elif self.ai_provider == "groq":
                return self._generate_groq_insights(data_summary)
            else:
                return self._fallback_insights(attendance_data, employee_data, dashboard_stats)
                
        except Exception as e:
            print(f"❌ AI insights generation failed: {e}")
            return self._fallback_insights(attendance_data, employee_data, dashboard_stats)
    
    def _prepare_data_summary(self, attendance_data: List[Dict], employee_data: List[Dict], dashboard_stats: Dict = None) -> str:
        """Prepare concise data summary for AI analysis - NEW structure with dashboard context"""
        # Calculate statistics
        total_employees = len(employee_data)
        active_employees = len([e for e in employee_data if e.get('is_active', True)])
        
        # NEW STRUCTURE: Each record has date, checkin{status, timestamp}, checkout{status, timestamp}
        # Filter records that have check-in
        records_with_checkin = [a for a in attendance_data if a.get('checkin')]
        records_with_checkout = [a for a in attendance_data if a.get('checkout')]
        
        # Get YESTERDAY'S attendance (100% complete data)
        yesterday = datetime.now().date() - timedelta(days=1)
        yesterday_str = yesterday.strftime('%Y-%m-%d')
        
        yesterday_records = [r for r in records_with_checkin if r.get('date') == yesterday_str]
        unique_employees_yesterday = len(yesterday_records)
        
        attendance_rate = (unique_employees_yesterday / active_employees * 100) if active_employees > 0 else 0
        
        # Late arrivals - using checkin.status
        late_arrivals = [r for r in yesterday_records if r.get('checkin', {}).get('status') == 'late']
        on_time_arrivals = [r for r in yesterday_records if r.get('checkin', {}).get('status') == 'ontime']
        
        late_percentage = (len(late_arrivals) / len(yesterday_records) * 100) if yesterday_records else 0
        
        print(f"🔍 Yesterday's attendance: {len(yesterday_records)} employees (100% complete data)")
        print(f"📊 Late: {len(late_arrivals)}, On-time: {len(on_time_arrivals)} ({late_percentage:.1f}% late)")
        
        # Calculate average working hours from work_duration_minutes (all checked out)
        total_work_minutes = sum(r.get('work_duration_minutes', 0) for r in yesterday_records)
        avg_working_hours = (total_work_minutes / len(yesterday_records) / 60) if yesterday_records else 0
        
        # Department distribution
        dept_distribution = {}
        for emp in employee_data:
            dept = emp.get('department', 'Unknown')
            dept_distribution[dept] = dept_distribution.get(dept, 0) + 1
        
        # Weekly trend - group by date
        weekly_data = self._get_weekly_trend_new(records_with_checkin)
        
        summary = f"""Attendance System Data Summary (Last 8 Days):

EMPLOYEE INFORMATION:
- Total Employees in System: {total_employees}
- Active Employees: {active_employees}
- Departments: {json.dumps(dept_distribution)}

YESTERDAY'S ATTENDANCE ({yesterday}) - Complete Data:
- Employees Present: {unique_employees_yesterday} out of {active_employees}
- Attendance Rate: {attendance_rate:.1f}%
- On-Time Arrivals: {len(on_time_arrivals)} employees
- Late Arrivals (after 9:00 AM): {len(late_arrivals)} employees ({late_percentage:.1f}%)
- Average Working Hours: {avg_working_hours:.1f} hours (all employees checked out)

WEEKLY CHECK-IN PATTERN (Past 7 Days before yesterday):
{json.dumps(weekly_data, indent=2)}

DATA QUALITY NOTES:
- Total attendance records (8 days): {len(records_with_checkin)}
- Records with check-out (8 days): {len(records_with_checkout)}
- Note: Analyzing yesterday's data ensures 100% completion (all check-ins and check-outs recorded).
"""
        
        # Add dashboard analytics context if available
        if dashboard_stats:
            summary += "\n" + self._format_dashboard_context(dashboard_stats)
        
        summary += "\nIMPORTANT: Base your analysis on ACTUAL numbers above. Do not extrapolate or assume percentages that aren't explicitly stated.\n"
        
        return summary
    
    def _format_dashboard_context(self, dashboard_stats: Dict) -> str:
        """Format dashboard statistics for AI context"""
        context = "\nDASHBOARD ANALYTICS CONTEXT:\n"
        
        # Summary stats
        if 'summary' in dashboard_stats:
            s = dashboard_stats['summary']
            context += f"""
CALCULATED METRICS (from Dashboard):
- Today's Total Attendance: {s.get('total', 0)}
- Late Arrivals Count: {s.get('critical', 0)}
- Compliance Rate: {s.get('compliance', 0)}%
- Total Active Employees: {s.get('total_employees', 0)}
"""
        
        # Department performance
        if 'departments' in dashboard_stats and dashboard_stats['departments']:
            context += "\nDEPARTMENT PERFORMANCE:\n"
            for dept in dashboard_stats['departments'][:5]:  # Top 5
                context += f"- {dept.get('department', 'Unknown')}: {dept.get('count', 0)} employees present\n"
        
        # Hourly pattern
        if 'hourly' in dashboard_stats and dashboard_stats['hourly']:
            hourly = dashboard_stats['hourly']
            peak_hour = max(hourly, key=lambda x: x.get('count', 0))
            context += f"\nPEAK CHECK-IN HOUR:\n- {peak_hour.get('hour', 'N/A')}: {peak_hour.get('count', 0)} check-ins\n"
        
        # Working duration
        if 'duration' in dashboard_stats:
            d = dashboard_stats['duration']
            context += f"""
WORKING HOURS STATISTICS:
- Average Working Duration: {d.get('average', 0):.1f} hours
- Longest Session: {d.get('longest', 0):.1f} hours
- Shortest Session: {d.get('shortest', 0):.1f} hours
"""
        
        # Attendance trend
        if 'trend' in dashboard_stats and dashboard_stats['trend']:
            context += "\nATTENDANCE TREND (Dashboard View):\n"
            for day_data in dashboard_stats['trend']:
                context += f"- {day_data.get('day', 'N/A')}: {day_data.get('count', 0)} employees\n"
        
        return context
    
    def _generate_openai_insights(self, data_summary: str) -> Dict[str, Any]:
        """Generate insights using OpenAI"""
        prompt = self._create_prompt(data_summary)
        
        # GPT-5 specific configuration
        params = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}  # GPT-5 works better with single user message
            ]
        }
        
        # Use appropriate parameters based on model
        if "gpt-5" in self.model.lower():
            # GPT-5: no max_tokens, no temperature control
            pass
        else:
            params["max_tokens"] = 500
            params["temperature"] = 0.7
        
        print(f"🔄 Sending request to {self.model}...")
        response = self.client.chat.completions.create(**params)
        
        content = response.choices[0].message.content if response.choices[0].message.content else ""
        print(f"📝 Received response ({len(content)} chars)")
        
        if not content or len(content) < 10:
            print("⚠️  Warning: Empty or very short response from AI")
            return self._fallback_insights([], [])
        
        return self._parse_ai_response(content)
    
    def _generate_anthropic_insights(self, data_summary: str) -> Dict[str, Any]:
        """Generate insights using Anthropic Claude"""
        prompt = self._create_prompt(data_summary)
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        content = response.content[0].text
        return self._parse_ai_response(content)
    
    def _generate_google_insights(self, data_summary: str) -> Dict[str, Any]:
        """Generate insights using Google Gemini"""
        prompt = self._create_prompt(data_summary)
        response = self.client.generate_content(prompt)
        return self._parse_ai_response(response.text)
    
    def _generate_groq_insights(self, data_summary: str) -> Dict[str, Any]:
        """Generate insights using Groq"""
        prompt = self._create_prompt(data_summary)
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an HR analytics expert. Provide concise, actionable insights."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        return self._parse_ai_response(content)
    
    def _create_prompt(self, data_summary: str) -> str:
        """Create enhanced prompt for AI with dashboard context"""
        return f"""You are an HR analytics expert analyzing employee attendance data with comprehensive dashboard metrics.

{data_summary}

ANALYSIS GUIDELINES:
1. Read ALL data CAREFULLY - both raw attendance records AND dashboard analytics.
2. CROSS-REFERENCE: Compare raw data with dashboard calculations to validate consistency.
3. DEPARTMENT INSIGHTS: If department performance data is available, identify top/bottom performers.
4. HOURLY PATTERNS: If peak hour data is available, comment on check-in timing patterns.
5. WORKING HOURS: If duration stats are available, assess work-life balance.
6. TRENDS: Compare yesterday's performance with the 7-day historical pattern.
7. Use ONLY numbers explicitly stated - do NOT make assumptions.
8. Provide SPECIFIC, ACTIONABLE recommendations for TODAY (e.g., "Focus on Engineering dept" not "Improve attendance").

Provide your analysis in this EXACT format:

SUMMARY: [Write 2-3 clear sentences covering: (1) Yesterday's attendance status with complete data, (2) Key performance metric, (3) Notable trend or pattern compared to previous 7 days]

KEY FINDINGS:
- [Finding 1: Yesterday's attendance/compliance performance with department comparison if available]
- [Finding 2: Punctuality/timing patterns from yesterday using hourly data if available]
- [Finding 3: One SPECIFIC actionable recommendation for TODAY based on yesterday's insights]

IMPORTANT: 
- Analyze YESTERDAY's complete data (all check-ins and check-outs recorded)
- If dashboard shows department data, mention specific department names
- If peak hour data exists, reference actual time periods
- Make recommendations targeted for TODAY based on yesterday's patterns
- Acknowledge positive patterns when data shows good performance"""
    
    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        lines = content.strip().split('\n')
        
        summary = ""
        key_findings = []
        
        in_findings = False
        for line in lines:
            line = line.strip()
            if line.startswith("SUMMARY:"):
                summary = line.replace("SUMMARY:", "").strip()
            elif "KEY FINDINGS:" in line or "KEY FINDINGS" in line:
                in_findings = True
            elif in_findings and line.startswith("-") or line.startswith("•"):
                finding = line.lstrip("-•").strip()
                if finding:
                    key_findings.append(finding)
        
        # Fallback if parsing failed
        if not summary or not key_findings:
            summary = "AI analysis completed. Please review the attendance data for detailed insights."
            key_findings = [
                "Regular monitoring recommended",
                "Check employee attendance patterns",
                "Review departmental performance"
            ]
        
        return {
            "summary": summary,
            "key_findings": key_findings[:3]  # Ensure only 3 findings
        }
    
    def _fallback_insights(self, attendance_data: List[Dict], employee_data: List[Dict], dashboard_stats: Dict = None) -> Dict[str, Any]:
        """Generate rule-based insights when AI is unavailable - using YESTERDAY's complete data"""
        total_employees = len([e for e in employee_data if e.get('is_active', True)])
        
        # Get yesterday's data (100% complete)
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        yesterday_checkins = [a for a in attendance_data if a.get('date') == yesterday and a.get('checkin')]
        
        attendance_rate = (len(yesterday_checkins) / total_employees * 100) if total_employees > 0 else 0
        
        # Generate findings based on rules
        findings = []
        
        if attendance_rate >= 90:
            findings.append("Excellent attendance yesterday above 90% - encourage team to maintain this today")
        elif attendance_rate >= 70:
            findings.append("Good attendance yesterday, aim for 90%+ today with targeted reminders")
        else:
            findings.append("⚠️ Low attendance yesterday detected - immediate engagement review needed today")
        
        # Check late arrivals from checkin.status
        late_count = sum(1 for a in yesterday_checkins if a.get('checkin', {}).get('status') == 'late')
        if late_count > len(yesterday_checkins) * 0.3:
            findings.append("⏰ High late arrivals yesterday - send morning reminders for today")
        else:
            findings.append("Good punctuality yesterday - maintain this with morning check-in focus today")
        
        # Working hours (complete data from yesterday)
        total_minutes = sum(a.get('work_duration_minutes', 0) for a in yesterday_checkins)
        avg_hours = (total_minutes / len(yesterday_checkins) / 60) if yesterday_checkins else 0
        
        if avg_hours > 0:
            if avg_hours < 7:
                findings.append("Working hours below standard yesterday - monitor engagement today")
            elif avg_hours > 10:
                findings.append("⚠️ High working hours yesterday - ensure balanced workload today")
            else:
                findings.append("Healthy working hours yesterday - maintain balance today")
        else:
            findings.append("Complete working hours data available from yesterday")
        
        summary = f"Yesterday's attendance was {attendance_rate:.1f}% with {len(yesterday_checkins)} out of {total_employees} employees present (complete data)."
        
        return {
            "summary": summary,
            "key_findings": findings[:3]
        }
    
    # Helper methods
    def _is_today(self, timestamp):
        """Check if timestamp is today"""
        if not timestamp:
            return False
        dt = self._parse_timestamp(timestamp)
        return dt.date() == datetime.now().date()
    
    def _parse_timestamp(self, timestamp):
        """Parse timestamp to datetime"""
        if isinstance(timestamp, datetime):
            return timestamp
        if isinstance(timestamp, str):
            return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return datetime.now()
    
    def _calculate_working_hours(self, attendance_data: List[Dict]) -> List[float]:
        """Calculate working hours from check-in/out pairs"""
        working_hours = []
        
        # Group by employee and date
        employee_dates = {}
        for record in attendance_data:
            emp_id = record.get('employee_id')
            timestamp = self._parse_timestamp(record.get('timestamp'))
            date_key = f"{emp_id}_{timestamp.date()}"
            
            if date_key not in employee_dates:
                employee_dates[date_key] = {'check_in': None, 'check_out': None}
            
            if record.get('action') == 'check-in':
                employee_dates[date_key]['check_in'] = timestamp
            elif record.get('action') == 'check-out':
                employee_dates[date_key]['check_out'] = timestamp
        
        # Calculate hours
        for data in employee_dates.values():
            if data['check_in'] and data['check_out']:
                hours = (data['check_out'] - data['check_in']).total_seconds() / 3600
                if 0 < hours < 24:  # Sanity check
                    working_hours.append(hours)
        
        return working_hours
    
    def _get_weekly_trend(self, attendance_data: List[Dict]) -> Dict[str, int]:
        """Get weekly attendance trend - OLD structure"""
        weekly = {day: 0 for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}
        
        for record in attendance_data:
            if record.get('action') == 'check-in':
                timestamp = self._parse_timestamp(record.get('timestamp'))
                day_name = timestamp.strftime('%A')
                if day_name in weekly:
                    weekly[day_name] += 1
        
        return weekly
    
    def _get_weekly_trend_new(self, attendance_data: List[Dict]) -> Dict[str, int]:
        """Get weekly attendance trend - NEW structure using date field"""
        weekly = {day: 0 for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}
        
        for record in attendance_data:
            date_str = record.get('date')
            if date_str:
                try:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    day_name = date_obj.strftime('%A')
                    if day_name in weekly:
                        weekly[day_name] += 1
                except:
                    pass
        
        return weekly
