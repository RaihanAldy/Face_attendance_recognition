import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

# Ambil kredensial dari .env
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

def send_late_email_alert(employee_name, employee_email, lateness_minutes):
    """
    Kirim email ke karyawan yang terlambat
    """
    if not employee_email:
        print(f"⚠️ Tidak ada email untuk {employee_name}, lewati notifikasi.")
        return False

    try:
        subject = f"[Keterlambatan] {employee_name} Terlambat {lateness_minutes} Menit"
        body = f"""
        Hai {employee_name},

        Kami mencatat bahwa kamu terlambat melakukan check-in hari ini. 
        berdasarkan catatan, kamu terlambat selama {lateness_minutes} menit.
        Mohon lebih memperhatikan jam kerja sesuai ketentuan yang berlaku.
        Terima kasih atas pengertiannya.

        Salam,
        Sistem Absensi Otomatis RECCA
        """

        msg = MIMEMultipart()
        msg["From"] = EMAIL_USER
        msg["To"] = employee_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        # Gunakan SMTP Gmail
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)

        print(f"📧 Email keterlambatan dikirim ke {employee_email}")
        return True

    except Exception as e:
        print(f"❌ Gagal mengirim email ke {employee_email}: {e}")
        return False
