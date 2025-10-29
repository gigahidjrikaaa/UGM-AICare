"""
Revenue Report Database Model

Stores historical revenue reports submitted to the blockchain.
Provides audit trail for all monthly profit distributions.
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from datetime import datetime

from app.database import Base


class RevenueReport(Base):
    """Monthly revenue report submitted to blockchain"""
    
    __tablename__ = "revenue_reports"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Time period
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)  # 1-12
    month_yyyymm = Column(Integer, nullable=False, unique=True, index=True)  # YYYYMM format
    
    # Revenue breakdown (stored in USDC)
    wellness_fees = Column(Numeric(20, 6), nullable=False, default=0)
    subscriptions = Column(Numeric(20, 6), nullable=False, default=0)
    nft_sales = Column(Numeric(20, 6), nullable=False, default=0)
    partner_fees = Column(Numeric(20, 6), nullable=False, default=0)
    treasury_returns = Column(Numeric(20, 6), nullable=False, default=0)
    
    # Totals
    total_revenue = Column(Numeric(20, 6), nullable=False)
    total_expenses = Column(Numeric(20, 6), nullable=False)
    net_profit = Column(Numeric(20, 6), nullable=False)
    
    # Blockchain submission
    submitted_to_blockchain = Column(Boolean, default=False, nullable=False)
    transaction_hash = Column(String(66), nullable=True, index=True)  # 0x + 64 chars
    block_number = Column(Integer, nullable=True)
    submission_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Multi-sig approval tracking
    approvals_count = Column(Integer, default=0, nullable=False)
    required_approvals = Column(Integer, default=3, nullable=False)
    finalized = Column(Boolean, default=False, nullable=False)
    finalized_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Challenge status
    challenged = Column(Boolean, default=False, nullable=False)
    challenge_reason = Column(Text, nullable=True)
    challenged_by = Column(String(42), nullable=True)  # Ethereum address
    challenged_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Profit distribution
    wakala_fee = Column(Numeric(20, 6), nullable=True)  # 10% platform fee
    distributable_profit = Column(Numeric(20, 6), nullable=True)
    distributed_to_stakers = Column(Numeric(20, 6), nullable=True)
    distribution_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    submitted_by = Column(String(42), nullable=True)  # Finance team member address
    notes = Column(Text, nullable=True)
    metadata = Column(JSON, nullable=True)  # Additional data (exchange rates, etc.)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<RevenueReport {self.month_yyyymm}: ${self.total_revenue} revenue, ${self.total_expenses} expenses, ${self.net_profit} profit>"
    
    @property
    def is_approved(self) -> bool:
        """Check if report has enough approvals"""
        return self.approvals_count >= self.required_approvals
    
    @property
    def can_be_finalized(self) -> bool:
        """Check if report can be finalized"""
        if not self.is_approved:
            return False
        if self.challenged:
            return False
        if self.finalized:
            return False
        
        # Check if 48-hour challenge period has passed
        if self.submission_timestamp:
            from datetime import timedelta
            challenge_period = timedelta(hours=48)
            challenge_end = self.submission_timestamp + challenge_period
            return datetime.utcnow() >= challenge_end
        
        return False


class RevenueApproval(Base):
    """Individual approvals for revenue reports (multi-sig tracking)"""
    
    __tablename__ = "revenue_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Report reference
    report_id = Column(Integer, nullable=False, index=True)  # Foreign key to revenue_reports
    month_yyyymm = Column(Integer, nullable=False, index=True)
    
    # Approver info
    approver_address = Column(String(42), nullable=False, index=True)  # Ethereum address
    approver_name = Column(String(100), nullable=True)  # Human-readable name
    
    # Approval details
    approved = Column(Boolean, default=True, nullable=False)
    approval_timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    transaction_hash = Column(String(66), nullable=True)  # On-chain approval tx
    
    # Metadata
    notes = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)  # For audit trail
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<RevenueApproval {self.month_yyyymm} by {self.approver_address}>"
