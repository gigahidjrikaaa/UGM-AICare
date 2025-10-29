"""
Finance Domain Module

Centralized module for financial operations:
- Revenue tracking and aggregation
- Report generation and management
- Blockchain integration for revenue reporting
- Monthly automation
- Finance API routes

Contains:
- models.py: Database models (RevenueReport, Transaction, etc.)
- schemas.py: Pydantic validation models
- revenue_tracker.py: Revenue aggregation logic
- revenue_scheduler.py: APScheduler monthly automation
- routes.py: FastAPI routes for finance operations
"""

from app.domains.finance.models import (
    RevenueReport,
    RevenueApproval,
    Transaction,
    Subscription,
    NFTTransaction,
    PartnerTransaction,
    ReportStatus,
    TransactionType,
    TransactionStatus,
    SubscriptionStatus
)

from app.domains.finance.schemas import (
    RevenueReportCreate,
    RevenueReportUpdate,
    RevenueReportResponse,
    RevenueReportListResponse,
    RevenueSubmissionResponse,
    RevenueBreakdownResponse,
    RevenueApprovalCreate,
    RevenueApprovalResponse
)

from app.domains.finance.revenue_tracker import revenue_tracker
from app.domains.finance.revenue_scheduler import scheduler, start_scheduler, stop_scheduler
from app.domains.finance.routes import router as finance_router

__all__ = [
    # Models
    "RevenueReport",
    "RevenueApproval",
    "Transaction",
    "Subscription",
    "NFTTransaction",
    "PartnerTransaction",
    # Enums
    "ReportStatus",
    "TransactionType",
    "TransactionStatus",
    "SubscriptionStatus",
    # Schemas
    "RevenueReportCreate",
    "RevenueReportUpdate",
    "RevenueReportResponse",
    "RevenueReportListResponse",
    "RevenueSubmissionResponse",
    "RevenueBreakdownResponse",
    "RevenueApprovalCreate",
    "RevenueApprovalResponse",
    # Services
    "revenue_tracker",
    # Scheduler
    "scheduler",
    "start_scheduler",
    "stop_scheduler",
    # Routes
    "finance_router"
]
