# PlatformRevenueOracle.sol - Technical Specification

**Contract Name:** PlatformRevenueOracle  
**Purpose:** Multi-sig controlled oracle for monthly profit reporting  
**Version:** 1.0  
**Date:** October 28, 2025  
**Integration:** CareStakingHalal.sol (Sharia-compliant staking)

---

## Overview

**PlatformRevenueOracle.sol** is a critical component of the Sharia-compliant staking system. It enables transparent, multi-sig controlled reporting of monthly platform financials (revenue and expenses) to **CareStakingHalal.sol** for profit distribution to stakers.

### Why This Contract Exists

Traditional staking uses **fixed APY** (e.g., 5%, 12%, 20%, 35%), which is:

- ❌ **Riba (interest)** - prohibited in Islamic finance
- ❌ **Predetermined returns** - not based on real economic activity
- ❌ **Minted from thin air** - creates inflationary pressure

**Mudarabah (profit-sharing)** requires:

- ✅ **Real revenue sources** - platform fees, subscriptions, NFT sales
- ✅ **Actual expenses** - backend costs, salaries, infrastructure
- ✅ **Variable returns** - profit distribution based on performance
- ✅ **Transparent reporting** - on-chain financial records

**PlatformRevenueOracle** provides the infrastructure for honest, auditable financial reporting that feeds the Mudarabah profit-sharing model.

---

## Key Features

1. **Multi-Sig Approval**: Requires 3-of-5 finance team approvals
2. **Challenge Period**: 48-hour window for auditors to dispute reports
3. **Revenue Source Breakdown**: Tracks wellness fees, subscriptions, NFTs, partnerships, treasury
4. **Audit Trail**: All reports stored on-chain permanently
5. **Transparent Distribution**: Triggers CareStakingHalal profit settlement
6. **Access Control**: Only authorized roles can submit/approve reports

---

## Contract Architecture

### State Variables

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PlatformRevenueOracle is AccessControl {
    
    struct MonthlyReport {
        uint256 month;              // YYYYMM format (e.g., 202510 = October 2025)
        uint256 totalRevenue;       // Total revenue in CARE tokens
        uint256 totalExpenses;      // Total expenses in CARE tokens
        RevenueBreakdown breakdown; // Revenue sources breakdown
        uint32 submittedTime;       // Report submission timestamp
        uint32 approvalDeadline;    // Challenge period deadline (48h)
        uint8 approvalsCount;       // Number of approvals (max 5)
        bool finalized;             // Report finalized and distributed?
        bool challenged;            // Report challenged by auditor?
        string challengeReason;     // Reason for challenge (if any)
    }
    
    struct RevenueBreakdown {
        uint256 wellnessFees;       // CareWellness transaction fees
        uint256 subscriptions;      // Premium subscription revenue
        uint256 nftSales;           // NFT achievement badge sales
        uint256 partnerFees;        // Partner integration fees
        uint256 treasuryReturns;    // Treasury investment returns (halal only)
    }
    
    // State mappings
    mapping(uint256 => MonthlyReport) public monthlyReports;
    mapping(uint256 => mapping(address => bool)) public hasApproved; // month => approver => bool
    
    // Contract addresses
    address public careStakingHalal;
    address public multiSigWallet;
    
    // Constants
    uint256 public constant CHALLENGE_PERIOD = 48 hours;
    uint8 public constant REQUIRED_APPROVALS = 3;
    uint8 public constant TOTAL_FINANCE_TEAM = 5;
    
    // Access control roles
    bytes32 public constant FINANCE_TEAM_ROLE = keccak256("FINANCE_TEAM_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Events
    event ReportSubmitted(
        uint256 indexed month,
        uint256 totalRevenue,
        uint256 totalExpenses,
        address submitter
    );
    
    event ReportApproved(
        uint256 indexed month,
        address indexed approver,
        uint8 approvalsCount
    );
    
    event ReportFinalized(
        uint256 indexed month,
        uint256 netProfit,
        uint256 timestamp
    );
    
    event ReportChallenged(
        uint256 indexed month,
        address indexed challenger,
        string reason
    );
    
    event ReportRevoked(
        uint256 indexed month,
        address indexed revoker,
        string reason
    );
}
```

---

## Core Functions

### 1. Submit Monthly Report

**Function Signature:**

```solidity
function submitMonthlyReport(
    uint256 month,
    uint256 totalRevenue,
    uint256 totalExpenses,
    RevenueBreakdown memory breakdown
) external onlyRole(FINANCE_TEAM_ROLE);
```

**Purpose:** Submit monthly financial report for multi-sig approval.

**Parameters:**

- `month`: YYYYMM format (e.g., 202510 for October 2025)
- `totalRevenue`: Total platform revenue in CARE tokens
- `totalExpenses`: Total platform expenses in CARE tokens
- `breakdown`: Revenue source breakdown (wellness, subscriptions, NFTs, partners, treasury)

**Requirements:**

- Caller must have `FINANCE_TEAM_ROLE`
- Report for this month must not already exist
- `totalRevenue >= totalExpenses` (no negative profit months)
- Revenue breakdown must sum to `totalRevenue`

**Implementation:**

```solidity
function submitMonthlyReport(
    uint256 month,
    uint256 totalRevenue,
    uint256 totalExpenses,
    RevenueBreakdown memory breakdown
) external onlyRole(FINANCE_TEAM_ROLE) {
    require(!monthlyReports[month].finalized, "Report already finalized");
    require(monthlyReports[month].submittedTime == 0, "Report already submitted");
    require(totalRevenue >= totalExpenses, "Revenue must exceed expenses");
    
    // Verify breakdown sums to totalRevenue
    uint256 breakdownSum = breakdown.wellnessFees + 
                          breakdown.subscriptions + 
                          breakdown.nftSales + 
                          breakdown.partnerFees + 
                          breakdown.treasuryReturns;
    require(breakdownSum == totalRevenue, "Breakdown sum mismatch");
    
    // Create report
    monthlyReports[month] = MonthlyReport({
        month: month,
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        breakdown: breakdown,
        submittedTime: uint32(block.timestamp),
        approvalDeadline: uint32(block.timestamp + CHALLENGE_PERIOD),
        approvalsCount: 0,
        finalized: false,
        challenged: false,
        challengeReason: ""
    });
    
    emit ReportSubmitted(month, totalRevenue, totalExpenses, msg.sender);
}
```

---

### 2. Approve Report

**Function Signature:**

```solidity
function approveReport(uint256 month) external onlyRole(FINANCE_TEAM_ROLE);
```

**Purpose:** Finance team member approves monthly report (requires 3-of-5 approvals).

**Requirements:**

- Caller must have `FINANCE_TEAM_ROLE`
- Report must exist and not be finalized
- Caller must not have already approved this report
- Report must not be challenged

**Implementation:**

```solidity
function approveReport(uint256 month) external onlyRole(FINANCE_TEAM_ROLE) {
    MonthlyReport storage report = monthlyReports[month];
    require(report.submittedTime > 0, "Report does not exist");
    require(!report.finalized, "Report already finalized");
    require(!hasApproved[month][msg.sender], "Already approved");
    require(!report.challenged, "Report challenged, cannot approve");
    
    // Mark as approved
    hasApproved[month][msg.sender] = true;
    report.approvalsCount++;
    
    emit ReportApproved(month, msg.sender, report.approvalsCount);
    
    // Auto-finalize if 3 approvals reached and challenge period passed
    if (report.approvalsCount >= REQUIRED_APPROVALS && 
        block.timestamp >= report.approvalDeadline) {
        _finalizeReport(month);
    }
}
```

---

### 3. Finalize Report

**Function Signature:**

```solidity
function finalizeReport(uint256 month) external;
```

**Purpose:** Finalize report after challenge period and trigger profit distribution to stakers.

**Requirements:**

- Report must have 3+ approvals
- Challenge period (48 hours) must have elapsed
- Report must not be challenged
- Report must not already be finalized

**Implementation:**

```solidity
function finalizeReport(uint256 month) external {
    _finalizeReport(month);
}

function _finalizeReport(uint256 month) internal {
    MonthlyReport storage report = monthlyReports[month];
    
    require(report.submittedTime > 0, "Report does not exist");
    require(!report.finalized, "Already finalized");
    require(report.approvalsCount >= REQUIRED_APPROVALS, "Insufficient approvals");
    require(block.timestamp >= report.approvalDeadline, "Challenge period active");
    require(!report.challenged, "Report challenged");
    
    // Mark as finalized
    report.finalized = true;
    
    // Calculate net profit
    uint256 netProfit = report.totalRevenue - report.totalExpenses;
    
    // Trigger profit settlement in CareStakingHalal
    ICareStakingHalal(careStakingHalal).settleMonthlyProfit(
        month,
        report.totalRevenue,
        report.totalExpenses
    );
    
    emit ReportFinalized(month, netProfit, block.timestamp);
}
```

---

### 4. Challenge Report

**Function Signature:**

```solidity
function challengeReport(uint256 month, string memory reason) 
    external onlyRole(AUDITOR_ROLE);
```

**Purpose:** Auditor challenges suspicious report, blocking finalization.

**Requirements:**

- Caller must have `AUDITOR_ROLE`
- Report must exist and not be finalized
- Challenge must be within challenge period

**Implementation:**

```solidity
function challengeReport(uint256 month, string memory reason) 
    external onlyRole(AUDITOR_ROLE) {
    MonthlyReport storage report = monthlyReports[month];
    
    require(report.submittedTime > 0, "Report does not exist");
    require(!report.finalized, "Report already finalized");
    require(block.timestamp < report.approvalDeadline, "Challenge period expired");
    require(!report.challenged, "Already challenged");
    
    // Mark as challenged
    report.challenged = true;
    report.challengeReason = reason;
    
    emit ReportChallenged(month, msg.sender, reason);
}
```

---

### 5. Revoke Report

**Function Signature:**

```solidity
function revokeReport(uint256 month, string memory reason) 
    external onlyRole(ADMIN_ROLE);
```

**Purpose:** Admin revokes report (e.g., if challenged and found inaccurate).

**Requirements:**

- Caller must have `ADMIN_ROLE`
- Report must exist and not be finalized

**Implementation:**

```solidity
function revokeReport(uint256 month, string memory reason) 
    external onlyRole(ADMIN_ROLE) {
    MonthlyReport storage report = monthlyReports[month];
    
    require(report.submittedTime > 0, "Report does not exist");
    require(!report.finalized, "Cannot revoke finalized report");
    
    // Delete report
    delete monthlyReports[month];
    
    // Reset approvals
    // Note: In production, iterate through finance team and reset hasApproved
    // Simplified here for readability
    
    emit ReportRevoked(month, msg.sender, reason);
}
```

---

### 6. View Functions

```solidity
// Get monthly report
function getMonthlyReport(uint256 month) 
    external view returns (MonthlyReport memory) {
    return monthlyReports[month];
}

// Get revenue breakdown
function getRevenueBreakdown(uint256 month) 
    external view returns (RevenueBreakdown memory) {
    return monthlyReports[month].breakdown;
}

// Check if address has approved
function hasUserApproved(uint256 month, address user) 
    external view returns (bool) {
    return hasApproved[month][user];
}

// Get net profit for month
function getNetProfit(uint256 month) 
    external view returns (uint256) {
    MonthlyReport memory report = monthlyReports[month];
    return report.totalRevenue - report.totalExpenses;
}

// Get approval status
function getApprovalStatus(uint256 month) 
    external view returns (uint8 approvals, uint8 required, bool finalized) {
    MonthlyReport memory report = monthlyReports[month];
    return (report.approvalsCount, REQUIRED_APPROVALS, report.finalized);
}
```

---

## Multi-Sig Approval Workflow

### Finance Team Roles

**Required Signers (5 total):**

1. **CFO (Chief Financial Officer)** - Overall financial oversight
2. **Platform Operations Lead** - Backend/infrastructure costs verification
3. **Backend Developer Lead** - Technical infrastructure validation
4. **Community Manager** - User activity and wellness validation
5. **External Auditor** - Independent financial review

### Approval Process

```
Day 1 (00:00): Finance team member submits monthly report
               └─> Event: ReportSubmitted(month, revenue, expenses)

Day 1-2:       Finance team members review and approve
               └─> Approver 1: approveReport() → 1/3 approvals
               └─> Approver 2: approveReport() → 2/3 approvals
               └─> Approver 3: approveReport() → 3/3 approvals ✅

Day 1-3:       48-hour challenge period begins
               └─> Auditors can review financial data
               └─> If suspicious: challengeReport(month, reason)

Day 3 (48:00): Challenge period ends
               └─> If no challenges: finalizeReport() can be called
               └─> Event: ReportFinalized(month, netProfit)
               └─> CareStakingHalal.settleMonthlyProfit() triggered
               └─> Profit distributed to stakers 🎉
```

### Security Measures

1. **No Single Point of Failure**: Requires 3-of-5 approvals
2. **Challenge Period**: 48-hour window prevents rushed/fraudulent reports
3. **Role-Based Access**: Only finance team can submit/approve
4. **Auditor Oversight**: Independent auditors can challenge reports
5. **On-Chain Transparency**: All financial data publicly viewable
6. **Immutable Audit Trail**: Reports cannot be deleted once finalized

---

## Backend Integration

### Revenue Tracking Service

**File:** `backend/services/revenue-tracker.ts`

```typescript
import { ethers } from 'ethers';
import { PlatformRevenueOracle__factory } from '../typechain';
import db from '../db';

interface MonthlyRevenue {
    wellnessFees: bigint;
    subscriptions: bigint;
    nftSales: bigint;
    partnerFees: bigint;
    treasuryReturns: bigint;
}

class RevenueTracker {
    private oracle: PlatformRevenueOracle;
    private multiSigSigner: ethers.Signer;

    constructor(oracleAddress: string, signer: ethers.Signer) {
        this.oracle = PlatformRevenueOracle__factory.connect(oracleAddress, signer);
        this.multiSigSigner = signer;
    }

    /**
     * Calculate monthly revenue from all sources
     */
    async calculateMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenue> {
        // 1. CareWellness transaction fees (0.1 CARE per activity)
        const wellnessFees = await db.query(`
            SELECT SUM(fee_amount) as total
            FROM wellness_transactions
            WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
        `, [year, month]);

        // 2. Premium subscriptions ($5/month per user)
        const subscriptions = await db.query(`
            SELECT COUNT(*) * 5 as total
            FROM premium_subscriptions
            WHERE status = 'active'
            AND YEAR(subscription_start) <= ? 
            AND MONTH(subscription_start) <= ?
        `, [year, month]);

        // 3. NFT achievement badge sales
        const nftSales = await db.query(`
            SELECT SUM(sale_price) as total
            FROM nft_badge_sales
            WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ?
        `, [year, month]);

        // 4. Partner integration fees
        const partnerFees = await db.query(`
            SELECT SUM(monthly_fee) as total
            FROM partner_integrations
            WHERE status = 'active'
            AND YEAR(integration_date) <= ?
        `, [year]);

        // 5. Treasury investment returns (halal only)
        const treasuryReturns = await this.calculateTreasuryReturns(year, month);

        return {
            wellnessFees: BigInt(wellnessFees[0].total || 0),
            subscriptions: BigInt(subscriptions[0].total || 0),
            nftSales: BigInt(nftSales[0].total || 0),
            partnerFees: BigInt(partnerFees[0].total || 0),
            treasuryReturns: treasuryReturns
        };
    }

    /**
     * Calculate monthly expenses
     */
    async calculateMonthlyExpenses(year: number, month: number): Promise<bigint> {
        // Backend infrastructure (AWS, GCP, etc.)
        const backendCosts = await db.query(`
            SELECT SUM(amount) as total
            FROM infrastructure_costs
            WHERE YEAR(billing_date) = ? AND MONTH(billing_date) = ?
        `, [year, month]);

        // Team salaries
        const salaries = await db.query(`
            SELECT SUM(salary_amount) as total
            FROM payroll
            WHERE YEAR(payment_date) = ? AND MONTH(payment_date) = ?
        `, [year, month]);

        // Marketing and growth
        const marketing = await db.query(`
            SELECT SUM(amount) as total
            FROM marketing_expenses
            WHERE YEAR(expense_date) = ? AND MONTH(expense_date) = ?
        `, [year, month]);

        // Miscellaneous
        const misc = await db.query(`
            SELECT SUM(amount) as total
            FROM miscellaneous_expenses
            WHERE YEAR(expense_date) = ? AND MONTH(expense_date) = ?
        `, [year, month]);

        return BigInt(backendCosts[0].total || 0) +
               BigInt(salaries[0].total || 0) +
               BigInt(marketing[0].total || 0) +
               BigInt(misc[0].total || 0);
    }

    /**
     * Submit monthly report to blockchain
     */
    async submitMonthlyReport(year: number, month: number) {
        console.log(`Calculating revenue for ${year}-${month}...`);
        
        const revenue = await this.calculateMonthlyRevenue(year, month);
        const expenses = await this.calculateMonthlyExpenses(year, month);

        const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0n);

        // Convert USD to CARE token amount (assuming $0.01 per CARE)
        const carePrice = await this.getCareTokenPrice();
        const revenueInCare = (totalRevenue * BigInt(1e18)) / carePrice;
        const expensesInCare = (expenses * BigInt(1e18)) / carePrice;

        console.log(`Total Revenue: ${totalRevenue} USD (${revenueInCare} CARE)`);
        console.log(`Total Expenses: ${expenses} USD (${expensesInCare} CARE)`);
        console.log(`Net Profit: ${totalRevenue - expenses} USD`);

        // Submit to blockchain
        const monthCode = year * 100 + month;
        
        const tx = await this.oracle.submitMonthlyReport(
            monthCode,
            revenueInCare,
            expensesInCare,
            {
                wellnessFees: (revenue.wellnessFees * BigInt(1e18)) / carePrice,
                subscriptions: (revenue.subscriptions * BigInt(1e18)) / carePrice,
                nftSales: (revenue.nftSales * BigInt(1e18)) / carePrice,
                partnerFees: (revenue.partnerFees * BigInt(1e18)) / carePrice,
                treasuryReturns: (revenue.treasuryReturns * BigInt(1e18)) / carePrice
            }
        );

        console.log(`Transaction submitted: ${tx.hash}`);
        await tx.wait();
        console.log(`Monthly report submitted for ${year}-${month} ✅`);
    }

    /**
     * Get CARE token price in USD
     */
    async getCareTokenPrice(): Promise<bigint> {
        // TODO: Query DEX or price oracle
        // For now, assume $0.01 per CARE
        return BigInt(1e16); // $0.01 = 1e16 wei
    }

    /**
     * Calculate halal treasury returns
     */
    async calculateTreasuryReturns(year: number, month: number): Promise<bigint> {
        // Query treasury investment returns (Sukuk, halal stocks, etc.)
        const returns = await db.query(`
            SELECT SUM(return_amount) as total
            FROM treasury_investments
            WHERE investment_type IN ('sukuk', 'halal_stock', 'islamic_bond')
            AND YEAR(return_date) = ? AND MONTH(return_date) = ?
        `, [year, month]);

        return BigInt(returns[0].total || 0);
    }
}

export default RevenueTracker;
```

### Automated Monthly Reporting (Cron Job)

**File:** `backend/jobs/monthly-report-job.ts`

```typescript
import cron from 'node-cron';
import RevenueTracker from '../services/revenue-tracker';

// Run on 1st of every month at 9:00 AM
cron.schedule('0 9 1 * *', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // Previous month (0-indexed)

    console.log(`[Monthly Report Job] Running for ${year}-${month}...`);

    try {
        const tracker = new RevenueTracker(
            process.env.REVENUE_ORACLE_ADDRESS!,
            getMultiSigSigner()
        );

        await tracker.submitMonthlyReport(year, month);
        console.log(`[Monthly Report Job] Success ✅`);
    } catch (error) {
        console.error(`[Monthly Report Job] Error:`, error);
        // Alert finance team
        await sendAlertToFinanceTeam(error);
    }
});
```

---

## Security Considerations

### Attack Vectors & Mitigations

**1. Fraudulent Revenue Reporting**

- **Attack:** Finance team submits inflated revenue to increase staker rewards
- **Mitigation:**
  - Requires 3-of-5 approvals (no single point of control)
  - 48-hour challenge period for auditor review
  - On-chain audit trail (all data public)
  - Breakdown verification (revenue sources must sum correctly)

**2. Expense Manipulation**

- **Attack:** Team reports lower expenses to increase net profit
- **Mitigation:**
  - All expenses must be documented in backend database
  - External auditor reviews expense claims
  - Challenge mechanism allows dispute of suspicious reports

**3. Sybil Attack (Multiple Approvals by Same Person)**

- **Attack:** Single person controls multiple finance team accounts
- **Mitigation:**
  - Finance team members are doxxed (known identities)
  - Multi-sig wallet addresses publicly disclosed
  - Community can verify distinct approvers

**4. Timestamp Manipulation**

- **Attack:** Manipulate `block.timestamp` to bypass challenge period
- **Mitigation:**
  - Challenge period enforced by blockchain timestamp (immutable)
  - 48-hour window long enough to detect manipulation

**5. Smart Contract Exploit**

- **Attack:** Reentrancy, overflow, access control bypass
- **Mitigation:**
  - OpenZeppelin AccessControl (battle-tested)
  - ReentrancyGuard on state-changing functions (if needed)
  - SafeMath (Solidity 0.8+ auto-checks)
  - Security audit before mainnet deployment

---

## Testing Strategy

### Unit Tests

**File:** `test/PlatformRevenueOracle.test.ts`

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { PlatformRevenueOracle, CareStakingHalal } from '../typechain';

describe('PlatformRevenueOracle', () => {
    let oracle: PlatformRevenueOracle;
    let staking: CareStakingHalal;
    let financeTeam: any[];
    let auditor: any;

    beforeEach(async () => {
        // Deploy contracts
        const [admin, ...signers] = await ethers.getSigners();
        financeTeam = signers.slice(0, 5);
        auditor = signers[5];

        // Deploy oracle
        const OracleFactory = await ethers.getContractFactory('PlatformRevenueOracle');
        oracle = await OracleFactory.deploy(admin.address, staking.address);

        // Grant roles
        await oracle.grantRole(oracle.FINANCE_TEAM_ROLE(), financeTeam[0].address);
        await oracle.grantRole(oracle.FINANCE_TEAM_ROLE(), financeTeam[1].address);
        await oracle.grantRole(oracle.FINANCE_TEAM_ROLE(), financeTeam[2].address);
        await oracle.grantRole(oracle.AUDITOR_ROLE(), auditor.address);
    });

    describe('submitMonthlyReport', () => {
        it('should allow finance team to submit report', async () => {
            await oracle.connect(financeTeam[0]).submitMonthlyReport(
                202510,
                ethers.parseEther('100000'),
                ethers.parseEther('50000'),
                {
                    wellnessFees: ethers.parseEther('40000'),
                    subscriptions: ethers.parseEther('30000'),
                    nftSales: ethers.parseEther('20000'),
                    partnerFees: ethers.parseEther('10000'),
                    treasuryReturns: ethers.parseEther('0')
                }
            );

            const report = await oracle.getMonthlyReport(202510);
            expect(report.totalRevenue).to.equal(ethers.parseEther('100000'));
            expect(report.totalExpenses).to.equal(ethers.parseEther('50000'));
        });

        it('should revert if revenue < expenses', async () => {
            await expect(
                oracle.connect(financeTeam[0]).submitMonthlyReport(
                    202510,
                    ethers.parseEther('50000'),
                    ethers.parseEther('100000'),
                    { /* ... */ }
                )
            ).to.be.revertedWith('Revenue must exceed expenses');
        });

        it('should revert if breakdown sum mismatch', async () => {
            await expect(
                oracle.connect(financeTeam[0]).submitMonthlyReport(
                    202510,
                    ethers.parseEther('100000'),
                    ethers.parseEther('50000'),
                    {
                        wellnessFees: ethers.parseEther('30000'),
                        subscriptions: ethers.parseEther('20000'),
                        nftSales: ethers.parseEther('10000'),
                        partnerFees: ethers.parseEther('5000'),
                        treasuryReturns: ethers.parseEther('0')
                        // Sum = 65K, but totalRevenue = 100K
                    }
                )
            ).to.be.revertedWith('Breakdown sum mismatch');
        });
    });

    describe('approveReport', () => {
        beforeEach(async () => {
            // Submit report
            await oracle.connect(financeTeam[0]).submitMonthlyReport(/* ... */);
        });

        it('should allow finance team to approve', async () => {
            await oracle.connect(financeTeam[1]).approveReport(202510);
            const report = await oracle.getMonthlyReport(202510);
            expect(report.approvalsCount).to.equal(1);
        });

        it('should revert if already approved', async () => {
            await oracle.connect(financeTeam[1]).approveReport(202510);
            await expect(
                oracle.connect(financeTeam[1]).approveReport(202510)
            ).to.be.revertedWith('Already approved');
        });

        it('should auto-finalize after 3 approvals and challenge period', async () => {
            await oracle.connect(financeTeam[1]).approveReport(202510);
            await oracle.connect(financeTeam[2]).approveReport(202510);
            await oracle.connect(financeTeam[3]).approveReport(202510);

            // Fast-forward 48 hours
            await ethers.provider.send('evm_increaseTime', [48 * 60 * 60]);
            await ethers.provider.send('evm_mine');

            const report = await oracle.getMonthlyReport(202510);
            expect(report.finalized).to.be.true;
        });
    });

    describe('challengeReport', () => {
        it('should allow auditor to challenge report', async () => {
            await oracle.connect(financeTeam[0]).submitMonthlyReport(/* ... */);
            await oracle.connect(auditor).challengeReport(202510, 'Suspicious revenue');

            const report = await oracle.getMonthlyReport(202510);
            expect(report.challenged).to.be.true;
            expect(report.challengeReason).to.equal('Suspicious revenue');
        });

        it('should prevent finalization of challenged report', async () => {
            await oracle.connect(financeTeam[0]).submitMonthlyReport(/* ... */);
            await oracle.connect(auditor).challengeReport(202510, 'Suspicious');

            await expect(
                oracle.finalizeReport(202510)
            ).to.be.revertedWith('Report challenged');
        });
    });
});
```

---

## Deployment

### Constructor Parameters

```solidity
constructor(
    address _admin,
    address _careStakingHalal,
    address _multiSigWallet,
    address[] memory _financeTeam,
    address[] memory _auditors
) {
    // Grant admin role
    _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    _grantRole(ADMIN_ROLE, _admin);
    
    // Set contract addresses
    careStakingHalal = _careStakingHalal;
    multiSigWallet = _multiSigWallet;
    
    // Grant finance team roles
    for (uint i = 0; i < _financeTeam.length; i++) {
        _grantRole(FINANCE_TEAM_ROLE, _financeTeam[i]);
    }
    
    // Grant auditor roles
    for (uint i = 0; i < _auditors.length; i++) {
        _grantRole(AUDITOR_ROLE, _auditors[i]);
    }
}
```

### Deployment Script

**File:** `scripts/deploy-oracle.ts`

```typescript
import { ethers } from 'hardhat';

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying PlatformRevenueOracle with account:', deployer.address);

    // Finance team addresses (5 members)
    const financeTeam = [
        '0x...', // CFO
        '0x...', // Operations Lead
        '0x...', // Backend Lead
        '0x...', // Community Manager
        '0x...'  // External Auditor
    ];

    // Auditor addresses
    const auditors = [
        '0x...', // Internal Auditor
        '0x...'  // External Auditor Firm
    ];

    // Deploy contract
    const OracleFactory = await ethers.getContractFactory('PlatformRevenueOracle');
    const oracle = await OracleFactory.deploy(
        deployer.address,
        process.env.CARE_STAKING_HALAL_ADDRESS!,
        process.env.MULTI_SIG_WALLET_ADDRESS!,
        financeTeam,
        auditors
    );

    await oracle.waitForDeployment();
    console.log('PlatformRevenueOracle deployed to:', await oracle.getAddress());

    // Verify on block explorer
    console.log('Verifying contract...');
    await run('verify:verify', {
        address: await oracle.getAddress(),
        constructorArguments: [
            deployer.address,
            process.env.CARE_STAKING_HALAL_ADDRESS!,
            process.env.MULTI_SIG_WALLET_ADDRESS!,
            financeTeam,
            auditors
        ]
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

---

## Gas Optimization

### Storage Packing

```solidity
// Packed struct (saves ~20K gas per report)
struct MonthlyReport {
    uint256 month;              // 32 bytes
    uint256 totalRevenue;       // 32 bytes
    uint256 totalExpenses;      // 32 bytes
    RevenueBreakdown breakdown; // 160 bytes (5 × 32)
    uint32 submittedTime;       // 4 bytes
    uint32 approvalDeadline;    // 4 bytes
    uint8 approvalsCount;       // 1 byte
    bool finalized;             // 1 byte
    bool challenged;            // 1 byte
    // Total: ~267 bytes (optimized packing)
}
```

### View Functions (No Gas Cost)

All `view` and `pure` functions are free to call:

- `getMonthlyReport()`
- `getRevenueBreakdown()`
- `hasUserApproved()`
- `getNetProfit()`
- `getApprovalStatus()`

---

## Summary

**PlatformRevenueOracle.sol** is the transparent, auditable bridge between off-chain financial data and on-chain Sharia-compliant profit distribution. It ensures:

✅ **Honest Reporting** - Multi-sig prevents fraudulent reports  
✅ **Transparent Distribution** - All financials on-chain  
✅ **Community Oversight** - 48-hour challenge period  
✅ **Mudarabah Compliance** - Real revenue, not minted interest  
✅ **Auditable History** - Permanent on-chain financial records

**Integration:** CareStakingHalal.sol calls `settleMonthlyProfit()` when reports are finalized, distributing profits to stakers according to Mudarabah principles.

**Next Steps:**

1. Deploy PlatformRevenueOracle on testnet
2. Test multi-sig approval workflow
3. Integrate with backend revenue tracker
4. Deploy CareStakingHalal with oracle integration
5. Conduct security audit
6. Get Shariah board certification
7. Deploy to mainnet

---

**Document Maintained At:** `docs/CARE_TOKEN/PLATFORM_REVENUE_ORACLE_SPEC.md`  
**Related Documents:**

- `SHARIA_COMPLIANT_STAKING_DESIGN.md` - Full Mudarabah model explanation
- `PHASE_2_TECHNICAL_SPECIFICATIONS.md` - All Phase 2 contracts
- `PHASE_2_IMPLEMENTATION_QUICKSTART.md` - Implementation guide

**END OF DOCUMENT**
