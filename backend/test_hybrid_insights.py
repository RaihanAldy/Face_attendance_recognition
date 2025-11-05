"""
Test Hybrid AI Insights (Database + Dashboard Stats)
"""
import requests
import json

API_BASE_URL = "http://localhost:5000/api"

def test_ai_insights():
    """Test AI insights endpoint with dashboard stats"""
    print("=" * 60)
    print("🧪 Testing Hybrid AI Insights")
    print("=" * 60)
    
    try:
        # Call AI insights endpoint
        print("\n📡 Calling /api/analytics/ai-insights...")
        response = requests.get(f"{API_BASE_URL}/analytics/ai-insights")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n✅ Response received!")
            print(f"   Provider: {data.get('provider', 'N/A')}")
            print(f"   Data range: {data.get('data_range', 'N/A')}")
            print(f"   Dashboard stats included: {data.get('stats', {}).get('dashboard_stats_included', False)}")
            
            insights = data.get('insights', {})
            
            print("\n" + "=" * 60)
            print("📊 AI INSIGHTS SUMMARY")
            print("=" * 60)
            print(insights.get('summary', 'No summary available'))
            
            print("\n" + "=" * 60)
            print("🔍 KEY FINDINGS")
            print("=" * 60)
            findings = insights.get('key_findings', [])
            for i, finding in enumerate(findings, 1):
                print(f"{i}. {finding}")
            
            print("\n" + "=" * 60)
            print("📈 STATS")
            print("=" * 60)
            stats = data.get('stats', {})
            print(f"   Total records: {stats.get('total_records', 0)}")
            print(f"   Total employees: {stats.get('total_employees', 0)}")
            print(f"   Generated at: {stats.get('generated_at', 'N/A')}")
            
            # Check if insights mention specific departments or times
            summary_text = insights.get('summary', '').lower()
            findings_text = ' '.join(findings).lower()
            
            print("\n" + "=" * 60)
            print("🎯 ENHANCEMENT CHECK")
            print("=" * 60)
            
            checks = {
                'Department mentioned': any(dept in summary_text + findings_text 
                                           for dept in ['engineering', 'marketing', 'sales', 'hr', 'department']),
                'Time/hour mentioned': any(time in summary_text + findings_text 
                                          for time in ['am', 'pm', 'hour', 'morning', 'afternoon']),
                'Specific numbers': any(char.isdigit() for char in summary_text),
                'Dashboard context': data.get('stats', {}).get('dashboard_stats_included', False)
            }
            
            for check, passed in checks.items():
                status = "✅" if passed else "❌"
                print(f"   {status} {check}")
            
            if all(checks.values()):
                print("\n🎉 EXCELLENT! AI is using enhanced context!")
            elif checks['Dashboard context']:
                print("\n👍 GOOD! Dashboard stats included, AI should use them.")
            else:
                print("\n⚠️  Dashboard stats not included, check backend logs.")
                
        else:
            print(f"\n❌ Error: HTTP {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Is backend running on port 5000?")
        print("   Run: python app.py")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    test_ai_insights()
