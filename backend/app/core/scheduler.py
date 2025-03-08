from apscheduler.schedulers.background import BackgroundScheduler
import datetime

scheduler = BackgroundScheduler()

def send_reminder():
    """ Example function for sending a scheduled reminder """
    print(f"[{datetime.datetime.now()}] Reminder: Take a deep breath!")

# Schedule to run every 2 hours
scheduler.add_job(send_reminder, "interval", hours=2)

def start_scheduler():
    scheduler.start()
