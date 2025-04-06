# backend/app/dependencies.py
from fastapi import Depends, HTTPException, Header # type: ignore
from sqlalchemy.orm import Session
from jose import JWTError, jwt # type: ignore

from app.models import User
import os
from dotenv import load_dotenv
from app.database import get_db  # make sure this is your DB dependency

# Load environment variables
load_dotenv()

# Get JWT settings from environment
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "sigmasigmaboysigmaboy")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

def get_current_google_user(
    Authorization: str = Header(...),
    db: Session = Depends(get_db),
):
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Invalid authorization header")

    token = Authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=403, detail="Invalid token")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")
