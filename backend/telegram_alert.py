# telegram_alert.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# Ambil chat_id untuk tes dari .env, atau gunakan yang dari database nanti
TEST_CHAT_ID = os.getenv("TESTER_TELEGRAM_CHAT_ID") 

def send_telegram_alert(employee_name, chat_id, lateness_minutes):
    """
    Kirim notifikasi keterlambatan ke Telegram
    """
    if not chat_id:
        print(f"⚠️ Tidak ada Telegram CHAT_ID untuk {employee_name}, lewati notifikasi.")
        return False
        
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env")
        return False

    # Format pesan (Telegram mendukung HTML sederhana)
    message = f"""
    🔔 <b>Notifikasi Keterlambatan</b> 🔔

Hai <b>{employee_name}</b>,
Kami mencatat bahwa kamu terlambat melakukan check-in hari ini. 
berdasarkan catatan, kamu terlambat selama {lateness_minutes} menit.
Mohon lebih memperhatikan jam kerja sesuai ketentuan yang berlaku.
Terima kasih atas pengertiannya.

Salam,
Sistem Absensi Otomatis RECCA
"""

    # URL API Telegram
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    payload = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'
    }

    try:
        response = requests.post(url, data=payload, timeout=5) # Timeout 5 detik
        response_json = response.json()
        
        if response_json.get('ok'):
            print(f"✅ Notifikasi Telegram terkirim ke {employee_name} (ChatID: {chat_id})")
            return True
        else:
            print(f"❌ Gagal kirim Telegram: {response_json.get('description')}")
            return False
            
    except Exception as e:
        print(f"❌ Gagal koneksi ke API Telegram: {e}")
        return False

# # Baris ini untuk tes cepat (opsional)
# if __name__ == "__main__":
#     print("Mengirim tes Telegram...")
#     send_telegram_alert("Karyawan Tes", TEST_CHAT_ID, 30)