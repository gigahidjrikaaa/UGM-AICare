# backend/app/routes/link_did.py
from fastapi import APIRouter, Depends, HTTPException # type: ignore
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models import User
from app.dependencies import get_current_active_user, get_db

router = APIRouter()

class LinkDIDRequest(BaseModel):
    wallet_address: str

@router.post("/link-did")
def link_did(payload: LinkDIDRequest, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    if not payload.wallet_address:
        raise HTTPException(status_code=400, detail="Missing wallet address")

    # Prevent collision
    existing = db.query(User).filter(User.wallet_address == payload.wallet_address).first()
    if existing:
        raise HTTPException(status_code=409, detail="This wallet is already linked to another account")

    user.wallet_address = payload.wallet_address
    db.commit()
    return {"status": "linked", "address": payload.wallet_address}
