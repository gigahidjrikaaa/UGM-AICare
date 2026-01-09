from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.domains.blockchain.pinata_client import PinataError, ipfs_uri, pin_file_to_ipfs, pin_json_to_ipfs
from app.domains.blockchain.edu_chain.nft_client import set_token_uri
from app.models import BadgeIssuance, BadgeTemplate, User, UserBadge
from app.schemas.admin.badges import (
    BadgeIssuanceListResponse,
    BadgeIssuanceResponse,
    BadgeMintRequest,
    BadgePublishResponse,
    BadgeTemplateCreate,
    BadgeTemplateListResponse,
    BadgeTemplateResponse,
    BadgeTemplateUpdate,
)


router = APIRouter(prefix="/badges", tags=["Admin Badges"])


def _as_template_response(template: BadgeTemplate) -> BadgeTemplateResponse:
    image_uri = ipfs_uri(template.image_cid) if template.image_cid else None
    return BadgeTemplateResponse(
        id=template.id,
        contract_address=template.contract_address,
        token_id=template.token_id,
        name=template.name,
        description=template.description,
        image_uri=image_uri,
        metadata_uri=template.metadata_uri,
        status=template.status,
        created_at=template.created_at,
        updated_at=template.updated_at,
        published_at=template.published_at,
    )


@router.get("/templates", response_model=BadgeTemplateListResponse)
async def list_badge_templates(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgeTemplateListResponse:
    del admin_user
    result = await db.execute(select(BadgeTemplate).order_by(BadgeTemplate.created_at.desc()))
    templates = list(result.scalars())
    return BadgeTemplateListResponse(templates=[_as_template_response(t) for t in templates])


@router.post("/templates", response_model=BadgeTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_badge_template(
    payload: BadgeTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgeTemplateResponse:
    del admin_user

    contract_address = (getattr(__import__("os"), "getenv")("NFT_CONTRACT_ADDRESS") or "").strip()
    if not contract_address:
        raise HTTPException(status_code=500, detail="NFT_CONTRACT_ADDRESS is not configured")

    template = BadgeTemplate(
        contract_address=contract_address,
        token_id=payload.token_id,
        name=payload.name,
        description=payload.description,
        status="DRAFT",
    )
    db.add(template)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Token ID already exists for this contract")
    await db.refresh(template)
    return _as_template_response(template)


@router.patch("/templates/{template_id}", response_model=BadgeTemplateResponse)
async def update_badge_template(
    template_id: int,
    payload: BadgeTemplateUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgeTemplateResponse:
    del admin_user

    template = await db.get(BadgeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Badge template not found")
    if template.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Published badges are immutable; create a new token id")

    if payload.name is not None:
        template.name = payload.name
    if payload.description is not None:
        template.description = payload.description

    db.add(template)
    await db.commit()
    await db.refresh(template)
    return _as_template_response(template)


@router.post("/templates/{template_id}/image", response_model=BadgeTemplateResponse)
async def upload_badge_image(
    template_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgeTemplateResponse:
    del admin_user

    template = await db.get(BadgeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Badge template not found")
    if template.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Cannot change image after publish")

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    try:
        pin = await pin_file_to_ipfs(
            file_bytes=raw,
            filename=file.filename or f"badge-{template.token_id}.png",
            content_type=content_type,
            name=f"badge-{template.token_id}-{template.name}",
        )
    except PinataError as e:
        raise HTTPException(status_code=502, detail=str(e))

    template.image_cid = pin.cid
    template.image_mime = content_type
    template.image_filename = file.filename
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return _as_template_response(template)


@router.post("/templates/{template_id}/publish", response_model=BadgePublishResponse)
async def publish_badge_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgePublishResponse:
    template = await db.get(BadgeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Badge template not found")
    if template.status != "DRAFT":
        raise HTTPException(status_code=409, detail="Badge template is already published/archived")
    if not template.image_cid:
        raise HTTPException(status_code=400, detail="Upload an image before publishing")

    # Create content-addressed metadata (immutable in practice).
    metadata = {
        "name": template.name,
        "description": template.description or "",
        "image": ipfs_uri(template.image_cid),
        "attributes": [
            {"trait_type": "token_id", "value": template.token_id},
            {"trait_type": "contract", "value": template.contract_address},
        ],
    }

    try:
        pinned = await pin_json_to_ipfs(payload=metadata, name=f"badge-{template.token_id}-metadata")
    except PinataError as e:
        raise HTTPException(status_code=502, detail=str(e))

    template.metadata_cid = pinned.cid
    template.metadata_uri = ipfs_uri(pinned.cid)
    template.status = "PUBLISHED"
    template.published_at = datetime.utcnow()
    db.add(template)
    await db.commit()
    await db.refresh(template)

    # Set on-chain token URI once (best-effort). This call is sync Web3, so run in threadpool.
    tx_hash: Optional[str] = None
    try:
        tx_hash = await run_in_threadpool(set_token_uri, template.token_id, template.metadata_uri)
    except Exception:
        tx_hash = None

    return BadgePublishResponse(
        template=_as_template_response(template),
        metadata_cid=pinned.cid,
        metadata_uri=template.metadata_uri,
        set_token_uri_tx_hash=tx_hash,
    )


@router.post("/templates/{template_id}/mint", response_model=BadgeIssuanceResponse, status_code=status.HTTP_201_CREATED)
async def mint_badge_to_user(
    template_id: int,
    payload: BadgeMintRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgeIssuanceResponse:
    template = await db.get(BadgeTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Badge template not found")
    if template.status != "PUBLISHED":
        raise HTTPException(status_code=409, detail="Only published badges can be minted")

    user = await db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    wallet = (user.wallet_address or "").strip()
    if not wallet:
        raise HTTPException(status_code=400, detail="User has no linked wallet_address")

    issuance = BadgeIssuance(
        template_id=template.id,
        user_id=user.id,
        requested_by_admin_id=admin_user.id,
        wallet_address=wallet,
        amount=payload.amount,
        status="PENDING",
    )
    db.add(issuance)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="This user already has an issuance for this badge")
    await db.refresh(issuance)

    from app.domains.blockchain.edu_chain.nft_client import mint_nft_badge

    tx_hash = await run_in_threadpool(mint_nft_badge, wallet, template.token_id, payload.amount)
    issuance.tx_hash = tx_hash
    issuance.status = "SENT" if tx_hash else "FAILED"
    issuance.error_reason = None if tx_hash else "Minting failed (no tx hash returned)"
    db.add(issuance)

    if tx_hash:
        # Maintain compatibility with existing "earned badges" UI.
        try:
            awarded = UserBadge(
                user_id=user.id,
                badge_id=template.token_id,
                contract_address=template.contract_address,
                transaction_hash=tx_hash,
            )
            db.add(awarded)
        except Exception:
            # Best-effort: do not fail the issuance log if the legacy table insert fails.
            pass

    await db.commit()
    await db.refresh(issuance)

    return BadgeIssuanceResponse(
        id=issuance.id,
        template_id=issuance.template_id,
        user_id=issuance.user_id,
        wallet_address=issuance.wallet_address,
        amount=issuance.amount,
        tx_hash=issuance.tx_hash,
        status=issuance.status,
        error_reason=issuance.error_reason,
        created_at=issuance.created_at,
        updated_at=issuance.updated_at,
    )


@router.get("/templates/{template_id}/issuances", response_model=BadgeIssuanceListResponse)
async def list_badge_issuances(
    template_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> BadgeIssuanceListResponse:
    del admin_user
    stmt = select(BadgeIssuance).where(BadgeIssuance.template_id == template_id).order_by(BadgeIssuance.created_at.desc())
    result = await db.execute(stmt)
    issuances = list(result.scalars())
    return BadgeIssuanceListResponse(
        issuances=[
            BadgeIssuanceResponse(
                id=i.id,
                template_id=i.template_id,
                user_id=i.user_id,
                wallet_address=i.wallet_address,
                amount=i.amount,
                tx_hash=i.tx_hash,
                status=i.status,
                error_reason=i.error_reason,
                created_at=i.created_at,
                updated_at=i.updated_at,
            )
            for i in issuances
        ]
    )
