# backend/app/routes/link_did.py
from fastapi import APIRouter, Depends, HTTPException # type: ignore
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User
from app.dependencies import get_current_active_user
from app.database import get_async_db
from app.schemas import LinkDIDRequest

router = APIRouter()

@router.post("/link-did")
async def link_did(payload: LinkDIDRequest, db: AsyncSession = Depends(get_async_db), user: User = Depends(get_current_active_user)):
    if not payload.wallet_address:
        raise HTTPException(status_code=400, detail="Missing wallet address")

    # Prevent collision
    result = await db.execute(select(User).filter(User.wallet_address == payload.wallet_address))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="This wallet is already linked to another account")

    setattr(user, 'wallet_address', payload.wallet_address)
    db.add(user)
    await db.commit()
    return {"status": "linked", "address": payload.wallet_address}
