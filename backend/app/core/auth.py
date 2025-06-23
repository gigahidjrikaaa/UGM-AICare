from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.database.crud import get_user_by_google_sub
from app.services.google_auth_service import verify_google_token
from app.database.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        idinfo = verify_google_token(token)
        google_sub = idinfo.get("sub")
        if google_sub is None:
            raise credentials_exception
    except HTTPException:
        # Re-raise the exception from verify_google_token, which will be a 401
        raise
    except Exception:
        # Catch any other exceptions during token processing
        raise credentials_exception

    user = get_user_by_google_sub(db, google_sub=google_sub)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user