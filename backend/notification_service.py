import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# URL API Gateway Lambda dari .env
LAMBDA_API_URL = os.getenv("LAMBDA_NOTIFICATION_URL")

# Timeout untuk request ke Lambda (dalam detik)
REQUEST_TIMEOUT = int(os.getenv("LAMBDA_REQUEST_TIMEOUT", "15"))


def send_all_notifications(employee_name, employee_email=None, lateness_minutes=0):

    payload = {
        "employee_name": employee_name,
        "lateness_minutes": lateness_minutes
    }
    
    # Email tetap kirim ke employee (jika ada)
    if employee_email:
        payload["employee_email"] = employee_email
    
    # ❌ TIDAK KIRIM telegram_chat_id, Lambda ambil sendiri dari env var!
    
    try:
        print(f"\n{'='*60}")
        print(f"🚀 Sending notification via Lambda")
        print(f"{'='*60}")
        print(f"Employee: {employee_name}")
        print(f"Email: {employee_email or 'Not provided (skip email)'}")
        print(f"Lateness: {lateness_minutes} minutes")
        print(f"Telegram: Will be sent to admin group (Lambda env var)")
        print(f"Lambda URL: {LAMBDA_API_URL}")
        print(f"{'='*60}\n")
        
        response = requests.post(
            LAMBDA_API_URL,
            json=payload,
            timeout=REQUEST_TIMEOUT,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Lambda Response:")
            print(f"   Email sent: {result.get('email_sent', False)}")
            print(f"   Telegram sent: {result.get('telegram_sent', False)}")
            print(f"   Errors: {result.get('errors', [])}")
            return result
        else:
            print(f"❌ Lambda error (HTTP {response.status_code}): {response.text}")
            return {
                'success': False,
                'error': f'Lambda returned status {response.status_code}',
                'email_sent': False,
                'telegram_sent': False
            }
            
    except requests.exceptions.Timeout:
        print(f"⏱️ Timeout saat menghubungi Lambda (>{REQUEST_TIMEOUT}s)")
        return {
            'success': False,
            'error': 'Request timeout',
            'email_sent': False,
            'telegram_sent': False
        }
    except requests.exceptions.ConnectionError as e:
        print(f"🔌 Gagal koneksi ke Lambda: {e}")
        return {
            'success': False,
            'error': f'Connection error: {str(e)}',
            'email_sent': False,
            'telegram_sent': False
        }
    except Exception as e:
        print(f"❌ Error calling Lambda: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e),
            'email_sent': False,
            'telegram_sent': False
        }


# ============================================
# BACKWARD COMPATIBILITY FUNCTIONS
# (untuk kode lama yang masih pakai fungsi ini)
# ============================================

def send_late_email_alert(employee_name, employee_email, lateness_minutes):
    """
    Legacy function - untuk backward compatibility
    
    KOMPATIBEL 100% dengan fungsi lama di email_alert.py
    
    Args:
        employee_name (str): Nama karyawan
        employee_email (str): Email karyawan
        lateness_minutes (int): Jumlah menit keterlambatan
    
    Returns:
        bool: True jika email berhasil dikirim, False jika gagal
    """
    if not employee_email:
        print(f"⚠️ Tidak ada email untuk {employee_name}, lewati notifikasi.")
        return False
    
    result = send_all_notifications(
        employee_name=employee_name,
        employee_email=employee_email,
        lateness_minutes=lateness_minutes
    )
    
    # Return True jika email berhasil dikirim
    return result.get('email_sent', False) if result else False


def send_telegram_alert(employee_name, chat_id, lateness_minutes):

    print(f"⚠️ send_telegram_alert() called with chat_id={chat_id} (will be ignored)")
    print(f"   Using global TELEGRAM_CHAT_ID from Lambda env var instead")
    
    result = send_all_notifications(
        employee_name=employee_name,
        employee_email=None,  # Tidak kirim email
        lateness_minutes=lateness_minutes
    )
    
    # Return True jika telegram berhasil dikirim
    return result.get('telegram_sent', False) if result else False


# ============================================
# TEST FUNCTIONS
# ============================================

def test_notification_service():
    """
    Test function untuk debugging
    """
    print("\n" + "="*60)
    print("🧪 TESTING NOTIFICATION SERVICE")
    print("="*60)
    
    # Test dengan email dan telegram
    result = send_all_notifications(
        employee_name="Test Employee",
        employee_email="test@example.com",
        lateness_minutes=25
    )
    
    print("\n📊 Test Result:")
    print(json.dumps(result, indent=2))
    print("="*60 + "\n")
    
    return result


if __name__ == "__main__":
    # Jalankan test jika file di-run langsung
    test_notification_service()