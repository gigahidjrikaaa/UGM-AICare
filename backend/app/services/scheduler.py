from celery import Celery
from datetime import datetime, timedelta
from database import SessionLocal
from models import User
from services.llm import get_ai_response

celery_app = Celery("tasks", broker="redis://localhost:6379/0")

@celery_app.task
def check_in_users():
    db = SessionLocal()
    users = db.query(User).all()
    
    for user in users:
        last_interaction = user.last_interaction
        if last_interaction and datetime.utcnow() - last_interaction > timedelta(days=3):
            message = "Hey, just checking in! How have you been feeling lately?"
            response = get_ai_response(message, user.id)
            # Send response via Twitter DM, Email, etc.

    db.close()
