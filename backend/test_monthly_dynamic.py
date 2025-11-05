"""
Test Monthly Check-ins - All Month Lengths (28, 29, 30, 31 days)
"""
import requests

API_BASE_URL = "http://localhost:5000/api"

def test_month(year, month, expected_days, month_name):
    """Test specific month"""
    print(f"\n{'='*60}")
    print(f"🗓️  Testing: {month_name} {year} (Expected: {expected_days} days)")
    print('='*60)
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/analytics/monthly-checkins",
            params={'year': year, 'month': month}
        )
        
        if response.status_code == 200:
            data = response.json()
            actual_days = len(data)
            
            print(f"✅ Response received: {actual_days} days")
            
            # Verify correct number of days
            if actual_days == expected_days:
                print(f"✅ CORRECT: {actual_days} == {expected_days}")
            else:
                print(f"❌ WRONG: {actual_days} != {expected_days}")
                return False
            
            # Show first and last day
            if data:
                first = data[0]
                last = data[-1]
                print(f"\n📅 First day: {first['date']} ({first['dayName']}) - {first['checkIns']} check-ins")
                print(f"📅 Last day:  {last['date']} ({last['dayName']}) - {last['checkIns']} check-ins")
                
                # Total check-ins
                total = sum(d['checkIns'] for d in data)
                print(f"📊 Total check-ins: {total}")
                
                # Peak day
                peak = max(data, key=lambda x: x['checkIns'])
                if peak['checkIns'] > 0:
                    print(f"🔥 Peak day: {peak['date']} ({peak['dayName']}) - {peak['checkIns']} check-ins")
            
            return True
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Backend not running?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("🧪 TESTING MONTHLY CHECK-INS - ALL MONTH LENGTHS")
    print("=" * 60)
    
    test_cases = [
        # (year, month, expected_days, month_name)
        (2025, 2, 28, "February (28 days - Non-leap year)"),
        (2024, 2, 29, "February (29 days - Leap year)"),
        (2025, 11, 30, "November (30 days)"),
        (2025, 4, 30, "April (30 days)"),
        (2025, 6, 30, "June (30 days)"),
        (2025, 9, 30, "September (30 days)"),
        (2025, 1, 31, "January (31 days)"),
        (2025, 3, 31, "March (31 days)"),
        (2025, 5, 31, "May (31 days)"),
        (2025, 7, 31, "July (31 days)"),
        (2025, 8, 31, "August (31 days)"),
        (2025, 10, 31, "October (31 days)"),
        (2025, 12, 31, "December (31 days)"),
    ]
    
    results = []
    for year, month, expected_days, month_name in test_cases:
        result = test_month(year, month, expected_days, month_name)
        results.append((month_name, result))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for month_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {month_name}")
    
    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Dynamic month handling works perfectly!")
    else:
        print(f"⚠️  {total - passed} test(s) failed")
    print("=" * 60)

if __name__ == "__main__":
    main()
