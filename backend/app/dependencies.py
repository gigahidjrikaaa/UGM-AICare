# backend/app/dependencies.py
import logging
from fastapi import Depends, HTTPException, Header # type: ignore
from sqlalchemy.orm import Session
from jose import JWTError, jwt # type: ignore

from app.models import User
import os
from dotenv import load_dotenv
import time
from app.database import get_db  # make sure this is your DB dependency

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Get JWT settings from environment
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "sigmasigmaboysigmaboy")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS512")

def get_current_google_user(
    Authorization: str = Header(...),
    db: Session = Depends(get_db),
):
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Invalid authorization header")

    logger.info(f"Authorization header: {Authorization}")
    logger.info(f"Token: {Authorization.split(' ')[1]}")
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
        logger.error(jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM]))
        raise HTTPException(status_code=403, detail="Invalid token")
