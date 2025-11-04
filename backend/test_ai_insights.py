"""
Test AI Insights Generator dengan data real
"""
from ai_insights import AIInsightsGenerator
from datetime import datetime

print("=" * 50)
print("Testing AI Insights Generator")
print("=" * 50)

# Test data (simulasi data dari MongoDB)
test_attendance = [
    {'employee_id': '1', 'action': 'check-in', 'timestamp': datetime(2025, 11, 3, 8, 30)},
    {'employee_id': '2', 'action': 'check-in', 'timestamp': datetime(2025, 11, 3, 9, 15)},
    {'employee_id': '3', 'action': 'check-in', 'timestamp': datetime(2025, 11, 3, 8, 45)},
    {'employee_id': '4', 'action': 'check-in', 'timestamp': datetime(2025, 11, 3, 10, 00)},
    {'employee_id': '1', 'action': 'check-out', 'timestamp': datetime(2025, 11, 3, 17, 30)},
    {'employee_id': '2', 'action': 'check-out', 'timestamp': datetime(2025, 11, 3, 18, 00)},
]

test_employees = [
    {'_id': '1', 'name': 'John Doe', 'department': 'Engineering', 'is_active': True},
    {'_id': '2', 'name': 'Jane Smith', 'department': 'Marketing', 'is_active': True},
    {'_id': '3', 'name': 'Bob Wilson', 'department': 'Engineering', 'is_active': True},
    {'_id': '4', 'name': 'Alice Brown', 'department': 'HR', 'is_active': True},
    {'_id': '5', 'name': 'Charlie Davis', 'department': 'Sales', 'is_active': False},
]

try:
    # Initialize AI generator
    print("\n🤖 Initializing AI Insights Generator...")
    ai = AIInsightsGenerator(ai_provider="openai")
    
    # Generate insights
    print("\n🔄 Generating insights from attendance data...")
    insights = ai.generate_insights(test_attendance, test_employees)
    
    # Display results
    print("\n" + "=" * 50)
    print("✅ INSIGHTS GENERATED SUCCESSFULLY!")
    print("=" * 50)
    
    print("\n📊 SUMMARY:")
    print(f"   {insights['summary']}")
    
    print("\n🔍 KEY FINDINGS:")
    for i, finding in enumerate(insights['key_findings'], 1):
        print(f"   {i}. {finding}")
    
    print("\n" + "=" * 50)
    print("✨ AI Insights working perfectly!")
    print("=" * 50)
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
