# Revenue Tracker Setup Guide

Complete guide for setting up the backend revenue tracker service for Sharia-compliant staking.

## 📋 Overview

The revenue tracker service:

1. **Aggregates** platform revenue from 5 streams (wellness, subscriptions, NFTs, partners, treasury)
2. **Calculates** monthly expenses
3. **Submits** reports to `PlatformRevenueOracle` smart contract
4. **Tracks** multi-sig approval workflow (3-of-5)
5. **Monitors** profit distribution to stakers

---

## 🚀 Quick Start

### 1. Deploy Smart Contracts

```bash
cd blockchain

# Set environment variables
export CARE_TOKEN_ADDRESS="0x..."
export CARE_TOKEN_CONTROLLER_ADDRESS="0x..."
export ADMIN_ADDRESS="0x..."
export SHARIAH_BOARD_ADDRESS="0x..."
export FINANCE_TEAM_1="0x..."
export FINANCE_TEAM_2="0x..."
export FINANCE_TEAM_3="0x..."
export FINANCE_TEAM_4="0x..."
export FINANCE_TEAM_5="0x..."
export AUDITOR_1="0x..."

# Deploy Phase 2 contracts
npx hardhat run scripts/deploy-phase2-staking.ts --network somniaTestnet

# Fund staking contract with 150M CARE
export CARE_STAKING_HALAL_ADDRESS="0x..."
npx hardhat run scripts/fund-staking-contract.ts --network somniaTestnet
```

**Output:**

```
📋 Contract Addresses:
   PlatformRevenueOracle: 0x1234...
   CareStakingHalal: 0xabcd...
```

---

### 2. Configure Backend

```bash
cd backend

# Copy example config
cp .env.revenue_tracker.example .env.revenue_tracker

# Edit configuration
nano .env.revenue_tracker
```

**Required Configuration:**

```bash
# Blockchain
SOMNIA_RPC_URL=https://rpc.somnia.network
PLATFORM_REVENUE_ORACLE_ADDRESS=0x1234...  # From deployment
CARE_STAKING_HALAL_ADDRESS=0xabcd...        # From deployment

# Finance team wallet (⚠️  KEEP SECRET)
FINANCE_TEAM_PRIVATE_KEY=0x...

# Scheduler
ENABLE_REVENUE_SCHEDULER=true
```

---

### 3. Install Dependencies

```bash
cd backend

# Install Python packages
pip install web3 eth-account apscheduler

# Or add to requirements.txt
echo "web3>=6.0.0" >> requirements.txt
echo "eth-account>=0.9.0" >> requirements.txt
echo "apscheduler>=3.10.0" >> requirements.txt

pip install -r requirements.txt
```

---

### 4. Run Database Migrations

```bash
cd backend

# Create revenue tables
alembic revision --autogenerate -m "Add revenue report tables"
alembic upgrade head
```

---

### 5. Start Backend Service

```bash
cd backend

# Load revenue tracker config
export $(cat .env.revenue_tracker | xargs)

# Start FastAPI with scheduler
uvicorn app.main:app --reload --port 8000
```

**Expected Output:**

```
✅ RevenueTrackerService initialized
   Oracle: 0x1234...
   Finance wallet: 0x5678...

🚀 Starting Monthly Revenue Scheduler...
✅ Monthly Revenue Scheduler started
   Schedule: 1st of every month at 1:00 AM UTC
   Next run: 2025-11-01 01:00:00+00:00
```

---

## 📊 API Endpoints

### Get Current Month Revenue (Real-Time)

```bash
curl -X GET http://localhost:8000/api/v1/revenue/current \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "year": 2025,
  "month": 10,
  "month_yyyymm": 202510,
  "revenue_breakdown": {
    "wellness_fees": "5000.00",
    "subscriptions": "3000.00",
    "nft_sales": "1500.00",
    "partner_fees": "2000.00",
    "treasury_returns": "2000.00",
    "total": "13500.00"
  },
  "total_revenue": "13500.00",
  "total_expenses": "3000.00",
  "net_profit": "10500.00",
  "submitted_to_blockchain": false
}
```

---

### Submit Monthly Report

```bash
curl -X POST http://localhost:8000/api/v1/revenue/submit \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2025,
    "month": 10
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Report submitted successfully for 2025-10. Awaiting 3-of-5 approvals.",
  "transaction_hash": "0xabc123...",
  "month_yyyymm": 202510
}
```

---

### Check Service Health

```bash
curl -X GET http://localhost:8000/api/v1/revenue/health
```

**Response:**

```json
{
  "status": "healthy",
  "web3_connected": true,
  "finance_wallet_configured": true,
  "finance_wallet_address": "0x5678...",
  "wallet_balance_eth": "1.5",
  "oracle_address": "0x1234..."
}
```

---

### Get Revenue Dashboard

```bash
curl -X GET http://localhost:8000/api/v1/revenue/dashboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "current_month": {
    "year": 2025,
    "month": 10,
    "revenue": "13500.00",
    "expenses": "3000.00",
    "net_profit": "10500.00",
    "breakdown": {
      "wellnessFees": "5000.00",
      "subscriptions": "3000.00",
      "nftSales": "1500.00",
      "partnerFees": "2000.00",
      "treasuryReturns": "2000.00"
    }
  },
  "last_6_months": [...],
  "ytd": {
    "total_revenue": "120000.00",
    "total_expenses": "30000.00",
    "net_profit": "90000.00"
  }
}
```

---

## 🔄 Monthly Report Workflow

### Automatic Submission (Scheduler)

1. **1st of each month at 1:00 AM UTC:**
   - Scheduler triggers `auto_submit_last_month()`
   - Aggregates revenue for previous month
   - Submits to blockchain via `submitMonthlyReport()`

2. **Multi-Sig Approval:**
   - 3 out of 5 finance team members approve via oracle contract
   - Each approval recorded on-chain

3. **48-Hour Challenge Period:**
   - Auditors can challenge suspicious reports
   - If challenged, admin must revoke and resubmit

4. **Finalization:**
   - After 48 hours with no challenges, anyone can finalize
   - Triggers `CareStakingHalal.settleMonthlyProfit()`
   - Profit distributed to stakers

5. **Database Logging:**
   - All steps logged to `revenue_reports` table
   - Approvals tracked in `revenue_approvals` table

---

### Manual Submission (Testing)

```bash
# Submit report for October 2025
curl -X POST http://localhost:8000/api/v1/revenue/submit \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "month": 10}'
```

---

## 🧪 Testing

### Test Mode (Every Minute)

For testing, enable test mode to run scheduler every minute:

```bash
export REVENUE_SCHEDULER_TEST_MODE=true
uvicorn app.main:app --reload --port 8000
```

**Output:**

```
⚠️  TEST MODE: Adding test job (runs every minute)
```

---

### Manual Trigger

```bash
curl -X POST http://localhost:8000/api/v1/revenue/auto-submit \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 📝 Database Schema

### revenue_reports

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| year | Integer | Report year |
| month | Integer | Report month (1-12) |
| month_yyyymm | Integer | YYYYMM format (unique) |
| wellness_fees | Numeric | Wellness service fees |
| subscriptions | Numeric | Premium subscriptions |
| nft_sales | Numeric | NFT badge sales |
| partner_fees | Numeric | Partner fees |
| treasury_returns | Numeric | Treasury returns |
| total_revenue | Numeric | Sum of all revenue |
| total_expenses | Numeric | Monthly expenses |
| net_profit | Numeric | Revenue - Expenses |
| submitted_to_blockchain | Boolean | Submission status |
| transaction_hash | String | Blockchain tx hash |
| approvals_count | Integer | Current approvals (0-5) |
| finalized | Boolean | Finalized status |
| challenged | Boolean | Challenge status |

---

### revenue_approvals

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| report_id | Integer | Report reference |
| month_yyyymm | Integer | Report month |
| approver_address | String | Finance team member |
| approved | Boolean | Approval status |
| approval_timestamp | DateTime | When approved |
| transaction_hash | String | On-chain approval tx |

---

## 🔐 Security Checklist

- [ ] **Finance wallet private key** stored securely (never commit to git)
- [ ] **Admin authentication** required for all revenue endpoints
- [ ] **Database backups** configured for audit trail
- [ ] **Web3 connection** uses HTTPS RPC endpoint
- [ ] **Multi-sig approval** enforced (3-of-5)
- [ ] **Challenge period** respected (48 hours)
- [ ] **Log rotation** configured for revenue tracker logs
- [ ] **Rate limiting** enabled on revenue submission endpoints
- [ ] **Monitoring alerts** set up for failed submissions

---

## 🚨 Troubleshooting

### Issue: "Finance wallet not configured"

**Solution:**

```bash
export FINANCE_TEAM_PRIVATE_KEY="0x..."
```

---

### Issue: "Transaction failed: insufficient funds"

**Solution:**

```bash
# Check wallet balance
curl http://localhost:8000/api/v1/revenue/health

# Fund wallet with ETH for gas
# Send ETH to finance_wallet_address
```

---

### Issue: "Web3 not connected"

**Solution:**

```bash
# Check RPC URL
export SOMNIA_RPC_URL="https://rpc.somnia.network"

# Test connection
python -c "from web3 import Web3; w3 = Web3(Web3.HTTPProvider('https://rpc.somnia.network')); print(w3.is_connected())"
```

---

### Issue: "Report already exists for this month"

**Solution:**

- Can only submit one report per month
- If need to revoke, use oracle contract's `revokeReport()` function (admin only)
- Then resubmit corrected report

---

## 📚 Additional Resources

- **Smart Contract Specs:** `docs/PHASE_2_TECHNICAL_SPECIFICATIONS.md`
- **Oracle Contract Spec:** `docs/PLATFORM_REVENUE_ORACLE_SPEC.md`
- **Sharia Compliance:** `docs/SHARIA_COMPLIANT_STAKING_DESIGN.md`
- **API Documentation:** <http://localhost:8000/docs> (FastAPI Swagger UI)

---

## 🔜 Next Steps

1. ✅ Deploy smart contracts
2. ✅ Configure backend service
3. ✅ Test manual submission
4. ⏳ Integrate with actual revenue data sources
5. ⏳ Set up multi-sig wallet for finance team
6. ⏳ Configure monitoring and alerts
7. ⏳ Submit first production report
8. ⏳ Verify profit distribution to stakers

---

**For support:** <dev@ugm-aicare.com>
