from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class BadgeTemplateBase(BaseModel):
    contract_address: str
    token_id: int
    name: str
    description: Optional[str] = None
    image_uri: Optional[str] = None
    metadata_uri: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None


class BadgeTemplateCreate(BaseModel):
    token_id: int = Field(..., ge=0)
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None


class BadgeTemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None


class BadgeTemplateResponse(BadgeTemplateBase):
    id: int


class BadgeTemplateListResponse(BaseModel):
    templates: List[BadgeTemplateResponse]


class BadgeIssuanceResponse(BaseModel):
    id: int
    template_id: int
    user_id: int
    wallet_address: str
    amount: int
    tx_hash: Optional[str] = None
    status: str
    error_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BadgeIssuanceListResponse(BaseModel):
    issuances: List[BadgeIssuanceResponse]


class BadgeMintRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    amount: int = Field(default=1, ge=1, le=100)


class BadgePublishResponse(BaseModel):
    template: BadgeTemplateResponse
    metadata_cid: str
    metadata_uri: str
    set_token_uri_tx_hash: Optional[str] = None
