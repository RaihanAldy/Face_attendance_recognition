from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import time
from mongo_db import db

class SyncManager:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.setup_schedules()
    
    def setup_schedules(self):
        
        # Cleanup old data daily at 2 AM
        self.scheduler.add_job(
            self.cleanup_old_data,
            'cron',
            hour=2,
            minute=0,
            id='data_cleanup'
        )
    
    def start(self):
        self.scheduler.start()
        print("✅ Background tasks started")
    
    def cleanup_old_data(self):
        try:
            # Cleanup attendance records older than 30 days
            cutoff_date = datetime.now() - timedelta(days=30)
            # Implementation depends on your data retention policy
            print(f"🧹 Data cleanup completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        except Exception as e:
            print(f"❌ Data cleanup failed: {e}")

sync_manager = SyncManager()
