# Phase 2 Smart Contracts - Technical Specifications

**Document Version:** 2.0 (Sharia-Compliant)  
**Date:** October 28, 2025  
**Status:** Research Complete - Ready for Implementation  
**SOMNIA Blockchain:** EVM-Compatible (Testnet: Chain ID 50312)  
**Compliance:** Sharia-Compliant (Mudarabah Profit-Sharing Model)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Contract 1: CareStakingHalal.sol (Sharia-Compliant)](#contract-1-carestakinghalalsol-sharia-compliant)
4. [Contract 1B: PlatformRevenueOracle.sol (NEW)](#contract-1b-platformrevenueoracle sol-new)
5. [Contract 2: CareWellness.sol](#contract-2-carewellnesssol)
6. [Contract 3: CareGovernance.sol](#contract-3-caregovernancesol)
7. [Contract 4: CareTreasury.sol](#contract-4-caretreasuryol)
8. [Security Patterns](#security-patterns)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Testing Strategy](#testing-strategy)
11. [References](#references)

---

## Executive Summary

This document provides **production-ready technical specifications** for Phase 2 of the $CARE token ecosystem, comprising **5 smart contracts** that will unlock **500M CARE tokens (50% of total supply)**.

**🔔 MAJOR UPDATE (October 2025):** CareStaking.sol has been **completely redesigned** to be **Sharia-compliant**, replacing interest-based APY with **Mudarabah profit-sharing**. This aligns with Islamic finance principles and opens access to the **$4 trillion global Islamic finance market**.

### Phase 2 Contracts Overview

| Contract | Allocation | Purpose | Estimated LOC | Status |
|----------|-----------|---------|---------------|--------|
| **CareStakingHalal.sol** | 150M CARE | Sharia-compliant profit-sharing staking | ~600 | **REDESIGNED** ✅ |
| **PlatformRevenueOracle.sol** | N/A | Monthly profit reporting for staking | ~200 | **NEW** ⭐ |
| **CareWellness.sol** | 200M CARE | Mental health activity rewards | ~600 | Unchanged |
| **CareGovernance.sol** | 50M CARE | DAO governance system | ~400 | Unchanged |
| **CareTreasury.sol** | 100M CARE | Multi-sig treasury + DEX buyback | ~300 | Minor updates |
| **TOTAL** | **500M CARE** | **Phase 2 Complete** | **~2,100 LOC** | |

### Key Design Principles

1. **Sharia-Compliant Finance**: Mudarabah profit-sharing (no riba/interest)
2. **Industry-Standard Frameworks**: Battle-tested patterns (OpenZeppelin Governor, Gnosis Safe)
3. **Security-First**: ReentrancyGuard, Pausable, comprehensive access controls
4. **Gas-Efficient**: Optimized for low transaction costs
5. **Modular Architecture**: Each contract is independent but integrates seamlessly
6. **Ethical Finance**: Appeals to Muslim users and ESG investors

---

## Research Findings

> **📌 NOTE:** The staking research below reflects the original APY-based design (v1.0). **CareStaking has been completely redesigned** for Sharia compliance. See [Contract 1](#contract-1-carestakinghalalsol-sharia-compliant) for the new Mudarabah profit-sharing model. The governance, treasury, and wellness research below remains valid and unchanged.

### Staking Best Practices (Original Research - Now Deprecated for CareStaking)

> **⚠️ DEPRECATED:** This APY-based staking model violates Islamic finance principles (riba/interest). Retained for historical reference only. **CareStaking now uses Mudarabah profit-sharing** instead.

**Source:** Synthetix StakingRewards, MasterChef, Speed Run Ethereum

**Key Patterns:**

- **Time-Weighted Rewards**: `rewardRate * stakedAmount / totalStaked` per second
- **Checkpoint System**: Track `lastUpdateTime` and `rewardPerTokenStored` for fair distribution
- **Dynamic APY**: Support oracle-based APY adjustments (Chainlink integration)
- **Compound Interest**: Auto-reinvest rewards without manual claim
- **Early Withdrawal Penalty**: Discourage premature unstaking (10% penalty)

**Code Example (Synthetix-Style Reward Calculation):**

```solidity
function rewardPerToken() public view returns (uint256) {
    if (totalStaked == 0) {
        return rewardPerTokenStored;
    }
    return rewardPerTokenStored + (
        (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalStaked
    );
}

function earned(address account) public view returns (uint256) {
    return (
        (stakedBalance[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18
    ) + rewards[account];
}
```

**Security Considerations:**

- Always use `ReentrancyGuard` on `stake()`, `unstake()`, and `claimRewards()`
- Implement emergency `pause()` and `unpause()` functions
- Gas optimization: Use `uint32` for timestamps, `uint96` for token amounts
- Avoid loops over unbounded arrays (user stakes tracked individually)

---

### Governance Best Practices

**Source:** OpenZeppelin Governor, Compound GovernorBravo, Tally

**Key Framework: OpenZeppelin Governor**

- **Released:** Contracts 4.3+
- **Modular Design**: Eliminates forking via Solidity inheritance
- **Gas-Efficient**: Minimal storage usage
- **Battle-Tested**: Used by Unlock Protocol, Euler, Babylon Finance, Uniswap DAO ($2B treasury)

**Core Modules:**

1. **Governor.sol** - Base proposal/voting logic
2. **GovernorVotes.sol** - Token-weighted voting with snapshots (ERC20Votes)
3. **GovernorVotesQuorumFraction.sol** - Quorum as % of total supply
4. **GovernorCountingSimple.sol** - Simple voting (For/Against/Abstain)
5. **GovernorTimelockControl.sol** - Delayed execution (security best practice)

**Code Example (OpenZeppelin Governor):**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract CareGovernance is 
    Governor, 
    GovernorCountingSimple, 
    GovernorVotes, 
    GovernorVotesQuorumFraction, 
    GovernorTimelockControl 
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("CareGovernance")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(10) // 10% quorum
        GovernorTimelockControl(_timelock)
    {}

    function votingDelay() public pure override returns (uint256) {
        return 1 days; // Delay before voting starts
    }

    function votingPeriod() public pure override returns (uint256) {
        return 1 weeks; // Voting duration
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 1000e18; // 1000 CARE to create proposal
    }
}
```

**Integration with CareStaking:**

- Only **365-day stakers** get voting power (enforces long-term alignment)
- Use `ERC20Votes` extension on CARE token for snapshot-based voting
- Voting power = staked CARE amount (no delegation initially)

**Tally Integration:**

- Tally provides UI for proposal creation, voting, and execution
- Compatible with OpenZeppelin Governor out-of-the-box
- Supports timelock visualization for transparency

---

### Treasury & Multi-Sig Best Practices

**Source:** Gnosis Safe, Uniswap DAO Treasury, LogRocket Tutorial

**Key Pattern: Gnosis Safe**

- **Battle-Tested**: Manages $100B+ across DeFi protocols
- **Multi-Signature**: 5-of-7 requirement for $CARE treasury
- **Spending Limits**: Programmable daily/weekly caps
- **Timelock Integration**: 7-day delay for large transactions (>10M CARE)
- **Modular Design**: SpendingLimitsModule, RecoveryModule, etc.

**Spending Tiers (Proposed for CareTreasury):**

| Transaction Size | Approval Requirement | Timelock |
|-----------------|---------------------|----------|
| < 1M CARE | 3-of-7 signers | None |
| 1M - 10M CARE | 5-of-7 signers | None |
| > 10M CARE | 5-of-7 signers | 7-day timelock |

**Code Example (Gnosis Safe SDK):**

```javascript
import Safe from '@safe-global/protocol-kit';
import { EthersAdapter } from '@safe-global/protocol-kit';

// Create Safe instance
const safe = await Safe.create({
    ethAdapter,
    safeAddress: treasuryAddress
});

// Propose transaction
const transaction = await safe.createTransaction({
    safeTransactionData: {
        to: recipientAddress,
        value: ethers.utils.parseEther('1000000'), // 1M CARE
        data: '0x' // Empty for simple transfer
    }
});

// Signer 1 approves
const txHash = await safe.getTransactionHash(transaction);
await safe.approveTransactionHash(txHash);

// Execute (after 5-of-7 signatures)
const executeTx = await safe.executeTransaction(transaction);
```

**DEX Buyback Mechanism:**

- Use **Uniswap V2 Router** for CARE buyback
- Automated buyback triggered by governance vote
- Burn mechanism: Transfer bought CARE to `address(0)` or lock in treasury

**Code Example (Uniswap V2 Buyback + Burn):**

```solidity
function buybackAndBurn(uint256 ethAmount) external onlyGovernance {
    require(ethAmount <= buybackBudget, "Exceeds buyback budget");

    // Create Uniswap path: WETH -> CARE
    address[] memory path = new address[](2);
    path[0] = uniswapRouter.WETH();
    path[1] = address(careToken);

    // Execute buyback
    uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{value: ethAmount}(
        0, // Accept any amount of CARE
        path,
        address(this), // Treasury receives CARE
        block.timestamp + 15 minutes
    );

    // Burn bought CARE
    uint256 careBought = amounts[1];
    careToken.burn(careBought); // Requires burn() function on CareToken

    emit BuybackAndBurn(ethAmount, careBought);
}
```

---

### Wellness Rewards & Anti-Gaming

**Source:** Security Checklists for Ethereum Smart Contracts, DeFi Best Practices

**Key Patterns:**

1. **Backend Signature Verification**: Off-chain activity validation, on-chain reward claim
2. **Cooldown Periods**: Per-activity rate limiting (e.g., 1 claim per 24 hours for CBT module)
3. **Halving Schedule**: Reduce rewards over time (Year 1: 100 CARE → Year 4+: 12.5 CARE)
4. **Annual Caps**: Contract enforces max 50M CARE minted in Year 1, 25M in Year 2, etc.
5. **Nonce/Signature Replay Protection**: Each signature valid for single claim

**Code Example (Signature Verification):**

```solidity
function claimWellnessReward(
    address user,
    uint8 activityType,
    uint256 rewardAmount,
    uint256 nonce,
    bytes memory signature
) external nonReentrant {
    // 1. Verify nonce not used
    require(!usedNonces[user][nonce], "Nonce already used");

    // 2. Verify cooldown period
    require(
        block.timestamp >= lastClaimTime[user][activityType] + cooldownPeriods[activityType],
        "Cooldown not elapsed"
    );

    // 3. Verify signature from backend
    bytes32 messageHash = keccak256(abi.encodePacked(user, activityType, rewardAmount, nonce));
    bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
    require(
        ethSignedMessageHash.recover(signature) == backendSigner,
        "Invalid signature"
    );

    // 4. Check annual cap
    require(
        yearlyMintedAmounts[currentYear] + rewardAmount <= yearlyMintCaps[currentYear],
        "Annual cap exceeded"
    );

    // 5. Mark nonce as used and update last claim time
    usedNonces[user][nonce] = true;
    lastClaimTime[user][activityType] = block.timestamp;
    yearlyMintedAmounts[currentYear] += rewardAmount;

    // 6. Mint and transfer reward
    careTokenController.mintFromCategory(WELLNESS_CATEGORY, user, rewardAmount);

    emit WellnessRewardClaimed(user, activityType, rewardAmount, nonce);
}
```

**Activity Types & Cooldown Periods:**

| Activity Type | Cooldown | Reward (Year 1) |
|--------------|---------|-----------------|
| CBT Module Completion | 24 hours | 100 CARE |
| Meditation Session | 12 hours | 50 CARE |
| Journal Entry | 24 hours | 25 CARE |
| Therapy Session Attended | 7 days | 200 CARE |
| Mood Check-In | 24 hours | 10 CARE |
| Support Group Participation | 3 days | 75 CARE |
| Wellness Challenge Completion | 7 days | 150 CARE |
| Peer Support Interaction | 24 hours | 30 CARE |
| Self-Assessment Completion | 7 days | 50 CARE |
| Resource Sharing | 12 hours | 20 CARE |
| Milestone Achievement | One-time | 500 CARE |

---

### Security Patterns (2025 Standards)

**Source:** Security Checklists for Ethereum Smart Contracts, OpenZeppelin Best Practices

**Critical Security Measures:**

1. **ReentrancyGuard** (ALL state-changing functions)

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

function stake(uint256 amount) external nonReentrant {
    // State changes before external calls
    stakedBalance[msg.sender] += amount;
    totalStaked += amount;
    
    // External call last (CEI pattern)
    careToken.transferFrom(msg.sender, address(this), amount);
}
```

2. **Pausable** (Emergency stop mechanism)

```solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

function stake(uint256 amount) external nonReentrant whenNotPaused {
    // Function logic
}

function pause() external onlyOwner {
    _pause();
}

function unpause() external onlyOwner {
    _unpause();
}
```

3. **Access Control** (Role-based permissions)

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
bytes32 public constant BACKEND_SIGNER_ROLE = keccak256("BACKEND_SIGNER_ROLE");

modifier onlyGovernance() {
    require(hasRole(GOVERNANCE_ROLE, msg.sender), "Not governance");
    _;
}
```

4. **Gas Optimization**

```solidity
// Use smaller types when possible (packing)
struct StakeInfo {
    uint96 amount;       // Max ~79B tokens (sufficient for CARE)
    uint32 lockPeriod;   // Max ~136 years in seconds
    uint32 startTime;    // Max until year 2106
    uint8 tier;          // 0-3 (4 tiers)
}

// Avoid unbounded loops
mapping(address => StakeInfo[]) public userStakes; // Instead of single array
```

5. **Off-Chain Computation + On-Chain Verification**

```solidity
// Backend computes reward amount and signs it
// Contract only verifies signature and enforces caps/cooldowns
// Reduces gas costs for complex calculations
```

6. **Emergency Functions**

```solidity
function emergencyWithdraw(address token, uint256 amount) external onlyOwner whenPaused {
    // Only callable when paused
    IERC20(token).transfer(owner(), amount);
    emit EmergencyWithdrawal(token, amount);
}
```

---

## Contract 1: CareStakingHalal.sol (Sharia-Compliant)

> **⚠️ MAJOR REDESIGN:** This contract has been completely rewritten to comply with Islamic finance principles. The original APY-based interest system has been replaced with **Mudarabah profit-sharing**. For full design rationale, see `docs/CARE_TOKEN/SHARIA_COMPLIANT_STAKING_DESIGN.md`.

### Overview

**Allocation:** 150M CARE  
**Distribution Model:** Profit-sharing from platform revenue (NOT fixed APY)  
**Estimated LOC:** ~600 lines  
**Dependencies:** OpenZeppelin (ReentrancyGuard, Pausable, AccessControl), CareTokenController, PlatformRevenueOracle  
**Compliance:** Mudarabah (Islamic profit-sharing partnership)

### Sharia Compliance Summary

**Prohibitions Avoided:**

- ❌ **Riba (Interest):** No fixed APY rates (original 5%, 12%, 20%, 35% removed)
- ❌ **Predetermined Returns:** Rewards vary based on actual platform performance
- ❌ **Time-Based Interest:** No continuous minting based on time locked

**Halal Mechanisms Used:**

- ✅ **Mudarabah (Profit-Sharing):** Stakers = Rabbul Mal (capital), Platform = Mudarib (manager)
- ✅ **Real Revenue Sources:** Transaction fees, subscriptions, partnerships (not minted interest)
- ✅ **Risk-Sharing:** Stakers share in platform profits AND losses
- ✅ **Transparent Distribution:** On-chain profit reporting via PlatformRevenueOracle
- ✅ **Wakala Fee:** 10% platform agency fee (permissible service charge)

### Staking Tiers (Participation-Based)

| Tier | Min Stake | Wellness Activities | Profit Share | Service Fee Waiver | Voting Power |
|------|-----------|--------------------|--------------|--------------------|--------------|
| **Bronze** | 1,000 CARE | 0 required | 60% | 0% | No |
| **Silver** | 10,000 CARE | 5 required | 70% | 25% | No |
| **Gold** | 50,000 CARE | 15 required | 80% | 50% | No |
| **Platinum** | 100,000 CARE | 30 required | 90% | 75% | Yes |

**Key Changes from Original Design:**

- ❌ **Removed:** Lock periods (30d, 90d, 180d, 365d) - not required for Sharia compliance
- ✅ **Added:** Wellness activity requirements (encourages platform engagement)
- ❌ **Removed:** Fixed APY percentages (riba/interest)
- ✅ **Added:** Profit-sharing ratios based on platform revenue
- ✅ **Keep:** Platinum tier voting power (utility-based, not interest)
- ✅ **Keep:** 10% early withdrawal penalty (legitimate service term)

### Revenue Sources (Halal)

Platform generates profit from **real economic activities** (NOT minted tokens):

1. **CareWellness Transaction Fees** (Primary Source)
   - Users pay 0.1 CARE per activity verification
   - Example: 100K monthly activities = 10K CARE in fees

2. **Premium Subscriptions**
   - Advanced AI coaching features: $5/month
   - Example: 1,000 subscribers = $5K/month

3. **NFT Achievement Badge Sales**
   - Mental health milestone NFTs
   - Example: 500 badges × $10 = $5K/month

4. **Partner Integration Fees**
   - Universities/therapy centers pay for platform integration
   - Example: 5 partners × $2K = $10K/month

5. **Treasury Investment Returns**
   - Halal investments only (Sukuk, Sharia-compliant stocks)
   - Example: $100K treasury × 5% annual = $417/month

**Total Example Monthly Revenue:** ~$30K (~3M CARE at $0.01)

### Profit Distribution Model

**Monthly Settlement Process:**

1. **Revenue Collection:** Platform collects all monthly revenue
2. **Expense Deduction:** Subtract operating costs (backend, salaries, infrastructure)
3. **Net Profit Calculation:** Revenue - Expenses = Net Profit
4. **Wakala Fee:** Platform takes 10% agency fee
5. **Distributable Profit:** 90% distributed to stakers
6. **Tier-Based Distribution:** Each tier gets profit share based on ratio and stake proportion

**Example Calculation:**

```
Month 1 Financials:
- Total Revenue: $30,000
- Total Expenses: $15,000
- Net Profit: $15,000
- Wakala Fee (10%): $1,500
- Distributable Profit: $13,500

Tier Distribution (assuming 10M CARE total staked):
- Bronze (5M CARE, 50%): $13,500 × 60% × 50% = $4,050
- Silver (3M CARE, 30%): $13,500 × 70% × 30% = $2,835
- Gold (1.5M CARE, 15%): $13,500 × 80% × 15% = $1,620
- Platinum (0.5M CARE, 5%): $13,500 × 90% × 5% = $607.50

User Rewards:
- Bronze user with 10K CARE (0.2% of Bronze pool): $4,050 × 0.2% = $8.10
- Platinum user with 100K CARE (20% of Platinum pool): $607.50 × 20% = $121.50

Converted to CARE (at $0.01):
- Bronze user receives: 810 CARE
- Platinum user receives: 12,150 CARE
```

**Variable Returns (Not Fixed APY):**

- Good month (high revenue): Higher rewards
- Bad month (low revenue): Lower rewards
- No profit: No rewards distributed
- **This is risk-sharing, NOT riba**

### Key Features

1. **Mudarabah Contract**: Islamic profit-sharing partnership structure
2. **Platform Revenue Oracle**: Monthly profit reporting via PlatformRevenueOracle.sol
3. **Participation-Based Tiers**: Wellness activity completion required for higher tiers
4. **Service Fee Waivers**: Higher tiers get reduced platform fees (Ijarah-compliant)
5. **Governance Integration**: Platinum tier grants voting power (utility-based)
6. **Risk-Sharing**: Stakers bear platform performance risk (halal)
7. **Transparent Distribution**: All profits on-chain, auditable
8. **Shariah Board Oversight**: Board can pause/modify for compliance

### Technical Specification

**State Variables:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CareStakingHalal is ReentrancyGuard, Pausable, AccessControl {
    
    struct StakeTier {
        uint256 minStakeAmount;      // Minimum CARE to stake
        uint16 profitShareBPS;       // Profit share in basis points (e.g., 6000 = 60%)
        uint16 serviceFeeWaiverBPS;  // Service fee waiver (e.g., 2500 = 25%)
        uint8 minWellnessActivities; // Required wellness activities
        uint256 totalStaked;         // Total CARE staked in tier
    }

    struct UserStake {
        uint96 amount;               // Staked amount
        uint32 startTime;            // Stake start timestamp
        uint32 lastClaimTime;        // Last profit claim timestamp
        uint8 tier;                  // 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
        uint16 wellnessActivitiesCompleted; // Activities completed
        uint256 unclaimedProfit;     // Unclaimed profit in CARE
    }

    struct MonthlyProfit {
        uint256 totalRevenue;        // Platform revenue
        uint256 totalExpenses;       // Platform expenses
        uint256 netProfit;           // Revenue - Expenses
        uint256 distributedAmount;   // CARE distributed to stakers
        uint32 settlementTime;       // Settlement timestamp
        bool settled;                // Month settled?
    }

    // Tier configurations (0=Bronze, 1=Silver, 2=Gold, 3=Platinum)
    mapping(uint8 => StakeTier) public stakeTiers;
    
    // User stakes
    mapping(address => UserStake[]) public userStakes;
    
    // Monthly profit tracking (format: YYYYMM, e.g., 202510)
    mapping(uint256 => MonthlyProfit) public monthlyProfits;
    uint256 public currentMonth;
    
    // Platform contracts
    IERC20 public careToken;
    address public careTokenController;
    address public platformRevenueOracle; // Reports monthly profits
    address public careWellnessContract;  // Tracks wellness activities
    address public shariahBoard;          // Shariah compliance oversight
    
    // Totals
    uint256 public totalStaked;
    uint256 public totalProfitDistributed;
    
    // Roles
    bytes32 public constant REVENUE_ORACLE_ROLE = keccak256("REVENUE_ORACLE_ROLE");
    bytes32 public constant SHARIAH_BOARD_ROLE = keccak256("SHARIAH_BOARD_ROLE");
    
    // Constants
    uint256 public constant WAKALA_FEE_BPS = 1000; // 10% platform Wakala fee
    uint256 public constant ALLOCATION = 150_000_000e18; // 150M CARE
    
    // Events
    event Staked(address indexed user, uint256 amount, uint8 tier);
    event Unstaked(address indexed user, uint256 amount, uint8 tier);
    event ProfitClaimed(address indexed user, uint256 amount, uint256 month);
    event MonthlyProfitSettled(uint256 month, uint256 netProfit, uint256 distributedAmount);
    event TierUpgraded(address indexed user, uint8 oldTier, uint8 newTier);
    event WellnessActivityRecorded(address indexed user, uint256 activityCount);
}
```

**Core Functions:**

```solidity
// Staking
function stake(uint256 amount, uint8 tier) external nonReentrant whenNotPaused;
function unstake(uint256 stakeIndex) external nonReentrant;

// Profit claiming
function claimProfit(uint256 stakeIndex) external nonReentrant;
function calculateUnclaimedProfit(address user, uint256 stakeIndex) public view returns (uint256);

// Monthly settlement (called by PlatformRevenueOracle)
function settleMonthlyProfit(uint256 month, uint256 totalRevenue, uint256 totalExpenses) 
    external onlyRole(REVENUE_ORACLE_ROLE);

// Wellness integration (called by CareWellness contract)
function recordWellnessActivity(address user) external;

// Governance
function getVotingPower(address user) public view returns (uint256);

// Admin
function updateTierConfig(uint8 tier, StakeTier memory config) 
    external onlyRole(SHARIAH_BOARD_ROLE);
```

**Staking Logic:**

```solidity
function stake(uint256 amount, uint8 tier) external nonReentrant whenNotPaused {
    require(amount > 0, "Amount must be > 0");
    require(tier < 4, "Invalid tier");
    
    StakeTier memory tierConfig = stakeTiers[tier];
    require(amount >= tierConfig.minStakeAmount, "Below minimum stake");
    
    // Check wellness activity requirement
    uint256 userActivityCount = getUserWellnessActivityCount(msg.sender);
    require(
        userActivityCount >= tierConfig.minWellnessActivities,
        "Insufficient wellness activities"
    );
    
    // Transfer CARE from user
    careToken.transferFrom(msg.sender, address(this), amount);
    
    // Create stake record
    UserStake memory newStake = UserStake({
        amount: uint96(amount),
        startTime: uint32(block.timestamp),
        lastClaimTime: uint32(block.timestamp),
        tier: tier,
        wellnessActivitiesCompleted: uint16(userActivityCount),
        unclaimedProfit: 0
    });
    
    userStakes[msg.sender].push(newStake);
    
    // Update totals
    stakeTiers[tier].totalStaked += amount;
    totalStaked += amount;
    
    emit Staked(msg.sender, amount, tier);
}
```

**Monthly Profit Settlement:**

```solidity
function settleMonthlyProfit(
    uint256 month,
    uint256 totalRevenue,
    uint256 totalExpenses
) external onlyRole(REVENUE_ORACLE_ROLE) {
    require(month == currentMonth, "Can only settle current month");
    require(!monthlyProfits[month].settled, "Month already settled");
    require(totalRevenue >= totalExpenses, "Revenue must exceed expenses");
    
    uint256 netProfit = totalRevenue - totalExpenses;
    
    // Deduct Wakala fee (10%)
    uint256 wakalaFee = (netProfit * WAKALA_FEE_BPS) / 10000;
    uint256 distributableProfit = netProfit - wakalaFee;
    
    // Calculate profit distribution per tier
    uint256 totalDistributed = 0;
    
    for (uint8 tier = 0; tier < 4; tier++) {
        StakeTier memory tierConfig = stakeTiers[tier];
        if (tierConfig.totalStaked > 0) {
            // Tier share = distributableProfit × profitShareRatio × (tierStaked / totalStaked)
            uint256 tierShare = (distributableProfit * tierConfig.profitShareBPS * tierConfig.totalStaked) 
                              / (10000 * totalStaked);
            totalDistributed += tierShare;
        }
    }
    
    // Record monthly profit
    monthlyProfits[month] = MonthlyProfit({
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        netProfit: netProfit,
        distributedAmount: totalDistributed,
        settlementTime: uint32(block.timestamp),
        settled: true
    });
    
    // Move to next month
    currentMonth = _incrementMonth(month);
    
    emit MonthlyProfitSettled(month, netProfit, totalDistributed);
}
```

**Profit Calculation:**

```solidity
function calculateUnclaimedProfit(address user, uint256 stakeIndex) public view returns (uint256) {
    UserStake memory userStake = userStakes[user][stakeIndex];
    if (userStake.amount == 0) return 0;
    
    StakeTier memory tierConfig = stakeTiers[userStake.tier];
    uint256 totalProfit = 0;
    
    // Iterate through settled months since last claim
    uint256 checkMonth = _getMonthFromTimestamp(userStake.lastClaimTime);
    uint256 currentCheckMonth = currentMonth;
    
    while (checkMonth < currentCheckMonth) {
        MonthlyProfit memory monthProfit = monthlyProfits[checkMonth];
        
        if (monthProfit.settled && tierConfig.totalStaked > 0) {
            // User's share = monthlyDistributed × profitShareRatio × (userStaked / tierStaked)
            uint256 userShare = (monthProfit.distributedAmount * tierConfig.profitShareBPS * userStake.amount) 
                              / (10000 * tierConfig.totalStaked);
            totalProfit += userShare;
        }
        
        checkMonth = _incrementMonth(checkMonth);
    }
    
    return totalProfit;
}
```

**Governance Integration:**

```solidity
function getVotingPower(address user) public view returns (uint256) {
    uint256 votingPower = 0;
    for (uint256 i = 0; i < userStakes[user].length; i++) {
        // Only Platinum tier (tier 3) gets voting power
        if (userStakes[user][i].tier == 3) {
            votingPower += userStakes[user][i].amount;
        }
    }
    return votingPower;
}
```

**Wellness Activity Integration:**

```solidity
function recordWellnessActivity(address user) external {
    require(msg.sender == careWellnessContract, "Only CareWellness");
    
    // Update activity count for all user stakes
    for (uint256 i = 0; i < userStakes[user].length; i++) {
        userStakes[user][i].wellnessActivitiesCompleted++;
    }
    
    emit WellnessActivityRecorded(user, userStakes[user][0].wellnessActivitiesCompleted);
    
    // Check if user can upgrade tier
    _checkTierUpgrade(user);
}

function _checkTierUpgrade(address user) internal {
    for (uint256 i = 0; i < userStakes[user].length; i++) {
        UserStake storage userStake = userStakes[user][i];
        uint8 currentTier = userStake.tier;
        
        // Check eligibility for higher tier
        for (uint8 newTier = currentTier + 1; newTier < 4; newTier++) {
            StakeTier memory newTierConfig = stakeTiers[newTier];
            
            if (userStake.amount >= newTierConfig.minStakeAmount &&
                userStake.wellnessActivitiesCompleted >= newTierConfig.minWellnessActivities) {
                // Upgrade tier
                stakeTiers[currentTier].totalStaked -= userStake.amount;
                stakeTiers[newTier].totalStaked += userStake.amount;
                userStake.tier = newTier;
                
                emit TierUpgraded(user, currentTier, newTier);
                break;
            }
        }
    }
}
```

### Integration with PlatformRevenueOracle

**Monthly Settlement Flow:**

```
1. Platform collects revenue from CareWellness, subscriptions, NFTs, etc.
2. Finance team prepares monthly profit report
3. Multi-sig wallet (3-of-5) approves report
4. PlatformRevenueOracle calls CareStakingHalal.settleMonthlyProfit()
5. Contract calculates tier-based profit distribution
6. Users can claim their profit share via claimProfit()
```

**See Contract 1B (PlatformRevenueOracle.sol) for full specifications.**

### Shariah Certification Path

**Recommended Steps:**

1. Submit contract code + whitepaper to Shariah advisory board
2. Board reviews Mudarabah structure for compliance
3. Iterative review process (4-6 weeks)
4. Receive Shariah compliance certificate
5. Display certificate on platform and in smart contracts
6. Annual re-certification required

**Recommended Boards:**

- AAOIFI (Bahrain)
- Malaysian Shariah Advisory Council
- Amanie Advisors (Malaysia/UAE)
- Shariyah Review Bureau (Bahrain)

**Estimated Cost:** $35K-70K Year 1, $5K-10K annually thereafter

---

## Contract 1B: PlatformRevenueOracle.sol (NEW)

> **⭐ NEW CONTRACT:** Required for Sharia-compliant staking. Reports monthly platform profits to CareStakingHalal.sol for distribution.

### Overview

**Purpose:** Multi-sig controlled oracle for reporting monthly platform financials  
**Estimated LOC:** ~200 lines  
**Dependencies:** OpenZeppelin (AccessControl), Gnosis Safe multi-sig  
**Integration:** CareStakingHalal.sol consumes monthly profit reports

### Key Features

1. **Multi-Sig Approval**: 3-of-5 finance team must approve profit reports
2. **Audit Trail**: All profit reports stored on-chain
3. **Dispute Resolution**: 48-hour challenge period before settlement
4. **Revenue Source Tracking**: Breakdown by source (wellness, subscriptions, etc.)
5. **Transparency**: Public view functions for all financial data

### Technical Specification

**State Variables:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract PlatformRevenueOracle is AccessControl {
    
    struct MonthlyReport {
        uint256 month;              // YYYYMM format
        uint256 totalRevenue;       // Total revenue in CARE
        uint256 totalExpenses;      // Total expenses in CARE
        RevenueBreakdown breakdown; // Revenue sources
        uint32 submittedTime;       // Report submission timestamp
        uint32 approvalDeadline;    // Challenge period deadline
        uint8 approvalsCount;       // Multi-sig approvals (3-of-5)
        bool finalized;             // Report finalized?
        bool challenged;            // Report challenged?
    }
    
    struct RevenueBreakdown {
        uint256 wellnessFees;       // CareWellness transaction fees
        uint256 subscriptions;      // Premium subscriptions
        uint256 nftSales;           // NFT badge sales
        uint256 partnerFees;        // Partner integration fees
        uint256 treasuryReturns;    // Treasury investment returns
    }
    
    mapping(uint256 => MonthlyReport) public monthlyReports;
    mapping(uint256 => mapping(address => bool)) public hasApproved; // month => approver => bool
    
    address public careStakingHalal;
    address public multiSigWallet;
    
    uint256 public constant CHALLENGE_PERIOD = 48 hours;
    uint8 public constant REQUIRED_APPROVALS = 3;
    
    bytes32 public constant FINANCE_TEAM_ROLE = keccak256("FINANCE_TEAM_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    event ReportSubmitted(uint256 month, uint256 revenue, uint256 expenses);
    event ReportApproved(uint256 month, address approver, uint8 approvalsCount);
    event ReportFinalized(uint256 month, uint256 netProfit);
    event ReportChallenged(uint256 month, address challenger, string reason);
}
```

**Core Functions:**

```solidity
// Submit monthly report (multi-sig controlled)
function submitMonthlyReport(
    uint256 month,
    uint256 totalRevenue,
    uint256 totalExpenses,
    RevenueBreakdown memory breakdown
) external onlyRole(FINANCE_TEAM_ROLE);

// Approve report (requires 3-of-5 approvals)
function approveReport(uint256 month) external onlyRole(FINANCE_TEAM_ROLE);

// Finalize report and trigger staking distribution (after challenge period)
function finalizeReport(uint256 month) external;

// Challenge report (if discrepancies found)
function challengeReport(uint256 month, string memory reason) 
    external onlyRole(AUDITOR_ROLE);

// View functions
function getMonthlyReport(uint256 month) external view returns (MonthlyReport memory);
function getRevenueBreakdown(uint256 month) external view returns (RevenueBreakdown memory);
```

**Report Submission Flow:**

```solidity
function submitMonthlyReport(
    uint256 month,
    uint256 totalRevenue,
    uint256 totalExpenses,
    RevenueBreakdown memory breakdown
) external onlyRole(FINANCE_TEAM_ROLE) {
    require(!monthlyReports[month].finalized, "Report already finalized");
    require(totalRevenue >= totalExpenses, "Revenue must exceed expenses");
    
    // Verify breakdown sums to totalRevenue
    uint256 breakdownSum = breakdown.wellnessFees + 
                          breakdown.subscriptions + 
                          breakdown.nftSales + 
                          breakdown.partnerFees + 
                          breakdown.treasuryReturns;
    require(breakdownSum == totalRevenue, "Breakdown mismatch");
    
    monthlyReports[month] = MonthlyReport({
        month: month,
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        breakdown: breakdown,
        submittedTime: uint32(block.timestamp),
        approvalDeadline: uint32(block.timestamp + CHALLENGE_PERIOD),
        approvalsCount: 0,
        finalized: false,
        challenged: false
    });
    
    emit ReportSubmitted(month, totalRevenue, totalExpenses);
}

function approveReport(uint256 month) external onlyRole(FINANCE_TEAM_ROLE) {
    MonthlyReport storage report = monthlyReports[month];
    require(!report.finalized, "Report already finalized");
    require(!hasApproved[month][msg.sender], "Already approved");
    
    hasApproved[month][msg.sender] = true;
    report.approvalsCount++;
    
    emit ReportApproved(month, msg.sender, report.approvalsCount);
}

function finalizeReport(uint256 month) external {
    MonthlyReport storage report = monthlyReports[month];
    require(!report.finalized, "Already finalized");
    require(report.approvalsCount >= REQUIRED_APPROVALS, "Insufficient approvals");
    require(block.timestamp >= report.approvalDeadline, "Challenge period active");
    require(!report.challenged, "Report challenged");
    
    report.finalized = true;
    
    // Trigger profit settlement in CareStakingHalal
    ICareStakingHalal(careStakingHalal).settleMonthlyProfit(
        month,
        report.totalRevenue,
        report.totalExpenses
    );
    
    emit ReportFinalized(month, report.totalRevenue - report.totalExpenses);
}
```

### Backend Integration

**Revenue Tracking Service:**

```typescript
// backend/services/revenue-tracker.ts
import { ethers } from 'ethers';
import { PlatformRevenueOracle__factory } from '../typechain';

interface MonthlyRevenue {
    wellnessFees: bigint;
    subscriptions: bigint;
    nftSales: bigint;
    partnerFees: bigint;
    treasuryReturns: bigint;
}

class RevenueTracker {
    async calculateMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenue> {
        // Query database for all revenue sources
        const wellnessFees = await this.getWellnessTransactionFees(year, month);
        const subscriptions = await this.getSubscriptionRevenue(year, month);
        const nftSales = await this.getNFTSalesRevenue(year, month);
        const partnerFees = await this.getPartnerIntegrationFees(year, month);
        const treasuryReturns = await this.getTreasuryInvestmentReturns(year, month);
        
        return {
            wellnessFees,
            subscriptions,
            nftSales,
            partnerFees,
            treasuryReturns
        };
    }
    
    async calculateMonthlyExpenses(year: number, month: number): Promise<bigint> {
        const backendCosts = await this.getBackendInfrastructureCosts(year, month);
        const salaries = await this.getSalaryCosts(year, month);
        const marketing = await this.getMarketingCosts(year, month);
        const miscExpenses = await this.getMiscellaneousCosts(year, month);
        
        return backendCosts + salaries + marketing + miscExpenses;
    }
    
    async submitMonthlyReport(year: number, month: number) {
        const revenue = await this.calculateMonthlyRevenue(year, month);
        const expenses = await this.calculateMonthlyExpenses(year, month);
        
        const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0n);
        
        // Convert to CARE token amount (assuming $0.01 per CARE)
        const carePrice = await this.getCareTokenPrice();
        const revenueInCare = totalRevenue / carePrice;
        const expensesInCare = expenses / carePrice;
        
        // Submit to blockchain via multi-sig
        const oracle = PlatformRevenueOracle__factory.connect(
            process.env.REVENUE_ORACLE_ADDRESS!,
            this.multiSigSigner
        );
        
        const tx = await oracle.submitMonthlyReport(
            year * 100 + month,
            revenueInCare,
            expensesInCare,
            {
                wellnessFees: revenue.wellnessFees / carePrice,
                subscriptions: revenue.subscriptions / carePrice,
                nftSales: revenue.nftSales / carePrice,
                partnerFees: revenue.partnerFees / carePrice,
                treasuryReturns: revenue.treasuryReturns / carePrice
            }
        );
        
        await tx.wait();
        console.log(`Monthly report submitted for ${year}-${month}`);
    }
}
```

### Multi-Sig Approval Process

**Required Finance Team Roles:**

1. CFO (Chief Financial Officer)
2. Platform Operations Lead
3. Backend Infrastructure Lead
4. Community Manager (user activity validation)
5. External Auditor (optional, for transparency)

**Approval Workflow:**

```
Day 1: Finance team member submits monthly report
Day 2-3: 2 additional finance team members approve (3-of-5)
Day 3-5: 48-hour challenge period (auditors can dispute)
Day 5: Report finalized, profit distributed to stakers
```

**Security Measures:**

- All approvers must be different addresses
- Challenge period prevents rushed/fraudulent reports
- All financial data on-chain (transparent)
- Auditors can challenge suspicious reports

---

## Contract 2: CareWellness.sol

### Overview

**Allocation:** 200M CARE  
**Halving Schedule:** Year 1 (100 CARE) → Year 2 (50) → Year 3 (25) → Year 4+ (12.5)  
**Annual Caps:** Year 1 (50M) → Year 2 (25M) → Year 3 (12.5M) → Year 4+ (6.25M)  
**Estimated LOC:** ~600 lines  
**Dependencies:** OpenZeppelin (ReentrancyGuard, Pausable, AccessControl, ECDSA), CareTokenController

### Activity Types

See [Wellness Rewards & Anti-Gaming](#wellness-rewards--anti-gaming) section for full list.

### Key Features

1. **Backend Signature Verification**: Off-chain activity validation (backend signs reward claim)
2. **Nonce-Based Replay Protection**: Each signature valid for single claim
3. **Per-Activity Cooldowns**: Rate limiting to prevent spam
4. **Halving Schedule**: Reward amounts reduce by 50% annually
5. **Annual Caps**: Contract enforces max minted amounts per year
6. **Multi-Activity Support**: 11 different mental health activities

### Technical Specification

**State Variables:**

```solidity
struct ActivityConfig {
    uint256 baseReward;         // Base reward amount (halved annually)
    uint32 cooldownPeriod;      // Cooldown between claims (seconds)
    bool enabled;               // Activity enabled/disabled
}

mapping(uint8 => ActivityConfig) public activityConfigs;
mapping(address => mapping(uint8 => uint256)) public lastClaimTime; // user => activityType => timestamp
mapping(address => mapping(uint256 => bool)) public usedNonces;     // user => nonce => used

uint256 public currentYear;
uint256 public yearStartTime;
mapping(uint256 => uint256) public yearlyMintedAmounts;
mapping(uint256 => uint256) public yearlyMintCaps;

address public backendSigner;
address public careTokenController;

uint256 public constant WELLNESS_CATEGORY = 5; // Category ID in CareTokenController
```

**Core Functions:**

```solidity
function claimWellnessReward(
    address user,
    uint8 activityType,
    uint256 rewardAmount,
    uint256 nonce,
    bytes memory signature
) external nonReentrant whenNotPaused;

function setActivityConfig(uint8 activityType, ActivityConfig memory config) external onlyGovernance;
function setBackendSigner(address newSigner) external onlyGovernance;
function getCurrentYearRewardAmount(uint8 activityType) public view returns (uint256);
```

**Claim Function (Full Implementation):**

```solidity
function claimWellnessReward(
    address user,
    uint8 activityType,
    uint256 rewardAmount,
    uint256 nonce,
    bytes memory signature
) external nonReentrant whenNotPaused {
    ActivityConfig memory config = activityConfigs[activityType];
    require(config.enabled, "Activity not enabled");

    // 1. Update year if needed
    if (block.timestamp >= yearStartTime + 365 days) {
        currentYear++;
        yearStartTime = block.timestamp;
    }

    // 2. Verify nonce not used
    require(!usedNonces[user][nonce], "Nonce already used");

    // 3. Verify cooldown period
    require(
        block.timestamp >= lastClaimTime[user][activityType] + config.cooldownPeriod,
        "Cooldown not elapsed"
    );

    // 4. Verify signature from backend
    bytes32 messageHash = keccak256(abi.encodePacked(user, activityType, rewardAmount, nonce));
    bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
    require(
        ECDSA.recover(ethSignedMessageHash, signature) == backendSigner,
        "Invalid signature"
    );

    // 5. Verify reward amount matches halving schedule
    uint256 expectedReward = getCurrentYearRewardAmount(activityType);
    require(rewardAmount == expectedReward, "Invalid reward amount");

    // 6. Check annual cap
    require(
        yearlyMintedAmounts[currentYear] + rewardAmount <= yearlyMintCaps[currentYear],
        "Annual cap exceeded"
    );

    // 7. Mark nonce as used and update last claim time
    usedNonces[user][nonce] = true;
    lastClaimTime[user][activityType] = block.timestamp;
    yearlyMintedAmounts[currentYear] += rewardAmount;

    // 8. Mint and transfer reward via CareTokenController
    ICareTokenController(careTokenController).mintFromCategory(WELLNESS_CATEGORY, user, rewardAmount);

    emit WellnessRewardClaimed(user, activityType, rewardAmount, nonce);
}
```

**Halving Schedule Logic:**

```solidity
function getCurrentYearRewardAmount(uint8 activityType) public view returns (uint256) {
    ActivityConfig memory config = activityConfigs[activityType];
    uint256 baseReward = config.baseReward;

    // Halve reward every year
    uint256 halvingFactor = 2 ** currentYear;
    uint256 currentReward = baseReward / halvingFactor;

    // Minimum reward: 12.5 CARE (after 3+ halvings)
    if (currentReward < 12.5e18) {
        currentReward = 12.5e18;
    }

    return currentReward;
}
```

**Backend Integration (Off-Chain Signing):**

```javascript
// Backend service (Node.js + ethers.js)
import { ethers } from 'ethers';

async function generateRewardSignature(
    userAddress: string,
    activityType: number,
    rewardAmount: string,
    nonce: number,
    signerPrivateKey: string
): Promise<string> {
    const signer = new ethers.Wallet(signerPrivateKey);

    // Create message hash (same as contract)
    const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint8', 'uint256', 'uint256'],
        [userAddress, activityType, rewardAmount, nonce]
    );

    // Sign message
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    return signature;
}

// API endpoint: POST /api/wellness/claim-reward
app.post('/api/wellness/claim-reward', async (req, res) => {
    const { userId, activityType } = req.body;

    // 1. Validate activity completion (check database, AI agent logs, etc.)
    const activityValid = await validateActivityCompletion(userId, activityType);
    if (!activityValid) {
        return res.status(400).json({ error: 'Activity not completed' });
    }

    // 2. Get user's wallet address
    const userAddress = await getUserWalletAddress(userId);

    // 3. Calculate reward amount (based on current year and halving)
    const currentYear = Math.floor((Date.now() - CONTRACT_START_TIME) / (365 * 24 * 60 * 60 * 1000));
    const baseReward = ACTIVITY_BASE_REWARDS[activityType];
    const rewardAmount = ethers.utils.parseEther((baseReward / (2 ** currentYear)).toString());

    // 4. Generate nonce (unique per claim)
    const nonce = Date.now();

    // 5. Generate signature
    const signature = await generateRewardSignature(
        userAddress,
        activityType,
        rewardAmount.toString(),
        nonce,
        process.env.BACKEND_SIGNER_PRIVATE_KEY
    );

    // 6. Return claim data to frontend
    res.json({
        userAddress,
        activityType,
        rewardAmount: rewardAmount.toString(),
        nonce,
        signature
    });
});
```

---

## Contract 3: CareGovernance.sol

### Overview

**Allocation:** 50M CARE  
**Voting Mechanism:** Token-weighted (ERC20Votes)  
**Quorum:** 10% of staked CARE (365-day stakers only)  
**Approval Threshold:** 66% (supermajority)  
**Estimated LOC:** ~400 lines  
**Dependencies:** OpenZeppelin (Governor, GovernorVotes, GovernorTimelockControl), CareStaking

### Proposal Types

1. **Parameter Changes**: Update staking APY, wellness reward amounts, cooldown periods
2. **Treasury Spending**: Authorize multi-sig transactions from CareTreasury
3. **Feature Toggles**: Enable/disable specific wellness activities or staking tiers
4. **Partner Approvals**: Whitelist new partners for token grants/airdrops
5. **Emergency Actions**: Pause contracts, emergency withdrawals

### Key Features

1. **OpenZeppelin Governor-Based**: Industry-standard modular framework
2. **TimelockController Integration**: 7-day delay for approved proposals (security)
3. **ERC20Votes Extension**: Snapshot-based voting (prevents double voting)
4. **Governance Rewards**: 10 CARE per vote, 1K CARE per approved proposal authorship
5. **Voting Power from Staking**: Only 365-day stakers (Platinum tier) can vote

### Technical Specification

**State Variables:**

```solidity
TimelockController public timelock;
IVotes public careToken; // ERC20Votes extension required

uint256 public constant VOTE_REWARD = 10e18; // 10 CARE per vote
uint256 public constant PROPOSAL_AUTHOR_REWARD = 1000e18; // 1K CARE for approved proposal

mapping(uint256 => address) public proposalAuthors;
mapping(uint256 => mapping(address => bool)) public hasVoted;
```

**Constructor:**

```solidity
constructor(
    IVotes _careToken,
    TimelockController _timelock,
    address _careTokenController
)
    Governor("CareGovernance")
    GovernorVotes(_careToken)
    GovernorVotesQuorumFraction(10) // 10% quorum
    GovernorTimelockControl(_timelock)
{
    careToken = _careToken;
    timelock = _timelock;
    careTokenController = _careTokenController;
}
```

**Voting Parameters:**

```solidity
function votingDelay() public pure override returns (uint256) {
    return 1 days; // Delay before voting starts (allows discussion)
}

function votingPeriod() public pure override returns (uint256) {
    return 1 weeks; // Voting duration
}

function proposalThreshold() public pure override returns (uint256) {
    return 1000e18; // 1000 CARE staked (Platinum tier) to create proposal
}

function quorum(uint256) public pure override returns (uint256) {
    // 10% of total voting power (Platinum tier stakers)
    // Calculated dynamically by GovernorVotesQuorumFraction
}
```

**Core Functions (Extended):**

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description
) public override returns (uint256) {
    uint256 proposalId = super.propose(targets, values, calldatas, description);
    proposalAuthors[proposalId] = msg.sender;
    return proposalId;
}

function castVote(uint256 proposalId, uint8 support) public override returns (uint256) {
    uint256 weight = super.castVote(proposalId, support);

    // Reward voter (10 CARE per vote)
    if (!hasVoted[proposalId][msg.sender]) {
        hasVoted[proposalId][msg.sender] = true;
        ICareTokenController(careTokenController).mintFromCategory(
            GOVERNANCE_CATEGORY,
            msg.sender,
            VOTE_REWARD
        );
    }

    return weight;
}

function execute(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
) public payable override returns (uint256) {
    uint256 proposalId = super.execute(targets, values, calldatas, descriptionHash);

    // Reward proposal author (1K CARE for approved proposal)
    address author = proposalAuthors[proposalId];
    if (author != address(0)) {
        ICareTokenController(careTokenController).mintFromCategory(
            GOVERNANCE_CATEGORY,
            author,
            PROPOSAL_AUTHOR_REWARD
        );
    }

    return proposalId;
}
```

**Voting Power Integration with CareStaking:**

```solidity
// Note: CareToken must implement ERC20Votes extension
// CareGovernance queries voting power via IVotes interface

// Example: User stakes 10K CARE in Platinum tier
// CareStaking contract calls careToken.delegate(user) on stake
// User gets 10K voting power in CareGovernance

// Implementation in CareStaking.sol:
function stake(uint256 amount, uint8 tier, bool compounding) external nonReentrant whenNotPaused {
    // ... stake logic ...

    // Delegate voting power to self if Platinum tier
    if (tier == 3) {
        IVotes(address(careToken)).delegate(msg.sender);
    }
}
```

**Proposal Examples:**

**Example 1: Increase Silver Tier APY from 12% to 15%**

```javascript
// Frontend: Create proposal
const targets = [careStakingAddress];
const values = [0];
const calldatas = [
    careStaking.interface.encodeFunctionData('setTierAPY', [1, 1500]) // Tier 1, 15% (1500 bps)
];
const description = "Proposal #1: Increase Silver Tier APY to 15%";

const proposalId = await careGovernance.propose(targets, values, calldatas, description);
```

**Example 2: Authorize 5M CARE Treasury Spend for Marketing**

```javascript
const targets = [careTreasuryAddress];
const values = [0];
const calldatas = [
    careTreasury.interface.encodeFunctionData('authorizeSpending', [
        marketingPartnerAddress,
        ethers.utils.parseEther('5000000') // 5M CARE
    ])
];
const description = "Proposal #2: Authorize 5M CARE for Q1 Marketing Campaign";

const proposalId = await careGovernance.propose(targets, values, calldatas, description);
```

**Tally Integration:**

- Visit [tally.xyz](https://www.tally.xyz)
- Connect CareGovernance contract address
- Tally auto-detects OpenZeppelin Governor and displays UI
- Users can create proposals, vote, and track execution status

---

## Contract 4: CareTreasury.sol

### Overview

**Allocation:** 100M CARE (50M operating reserve, 50M buyback fund)  
**Multi-Sig Requirement:** 5-of-7 signers  
**Spending Tiers:** <1M (3-of-7), 1-10M (5-of-7), >10M (5-of-7 + 7-day timelock)  
**Estimated LOC:** ~300 lines  
**Dependencies:** Gnosis Safe SDK (off-chain), OpenZeppelin (AccessControl, ReentrancyGuard), Uniswap V2 Router

### Key Features

1. **Gnosis Safe Integration**: Battle-tested multi-sig wallet
2. **Spending Limit Tiers**: Different approval requirements based on amount
3. **DEX Buyback Mechanism**: Automated CARE buyback via Uniswap V2
4. **Burn Functionality**: Burn bought-back tokens or lock in treasury
5. **Emergency Controls**: Governance-initiated emergency withdrawals
6. **Budget Tracking**: Operating reserve vs. buyback fund separation

### Technical Specification

**State Variables:**

```solidity
address public gnosisSafeAddress; // Multi-sig wallet address
address public uniswapV2Router;   // Uniswap V2 Router02 address
address public careToken;
address public careGovernance;

uint256 public operatingReserve = 50_000_000e18; // 50M CARE
uint256 public buybackFund = 50_000_000e18;      // 50M CARE

uint256 public totalBuybackAmount;
uint256 public totalBurnedAmount;

bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");
bytes32 public constant BUYBACK_ROLE = keccak256("BUYBACK_ROLE");

struct SpendingProposal {
    address recipient;
    uint256 amount;
    uint256 approvalCount;
    uint256 createdAt;
    bool executed;
    mapping(address => bool) approvals;
}

mapping(uint256 => SpendingProposal) public spendingProposals;
uint256 public proposalCount;

uint256 public constant TIMELOCK_PERIOD = 7 days;
```

**Core Functions:**

```solidity
function proposeSpending(address recipient, uint256 amount) external onlyTreasuryAdmin returns (uint256);
function approveSpending(uint256 proposalId) external onlyTreasuryAdmin;
function executeSpending(uint256 proposalId) external onlyTreasuryAdmin;
function buybackAndBurn(uint256 ethAmount) external onlyRole(BUYBACK_ROLE);
function emergencyWithdraw(address token, uint256 amount) external onlyGovernance;
```

**Spending Tier Logic:**

```solidity
function executeSpending(uint256 proposalId) external onlyTreasuryAdmin nonReentrant {
    SpendingProposal storage proposal = spendingProposals[proposalId];
    require(!proposal.executed, "Already executed");

    uint256 amount = proposal.amount;
    uint256 requiredApprovals;

    // Determine required approvals based on amount
    if (amount < 1_000_000e18) {
        requiredApprovals = 3; // 3-of-7
    } else if (amount <= 10_000_000e18) {
        requiredApprovals = 5; // 5-of-7
    } else {
        requiredApprovals = 5; // 5-of-7 + timelock
        require(
            block.timestamp >= proposal.createdAt + TIMELOCK_PERIOD,
            "Timelock not elapsed"
        );
    }

    require(proposal.approvalCount >= requiredApprovals, "Insufficient approvals");

    // Execute transfer
    IERC20(careToken).transfer(proposal.recipient, amount);
    proposal.executed = true;

    // Update reserves
    if (amount <= operatingReserve) {
        operatingReserve -= amount;
    } else {
        uint256 remainingAmount = amount - operatingReserve;
        operatingReserve = 0;
        buybackFund -= remainingAmount;
    }

    emit SpendingExecuted(proposalId, proposal.recipient, amount);
}
```

**DEX Buyback + Burn:**

```solidity
function buybackAndBurn(uint256 ethAmount) external onlyRole(BUYBACK_ROLE) nonReentrant {
    require(ethAmount <= address(this).balance, "Insufficient ETH balance");
    require(ethAmount <= buybackFund, "Exceeds buyback fund");

    // Create Uniswap path: WETH -> CARE
    address[] memory path = new address[](2);
    path[0] = IUniswapV2Router02(uniswapV2Router).WETH();
    path[1] = careToken;

    // Approve router to spend ETH (wrapped as WETH)
    // Note: For ETH input, no approval needed (use swapExactETHForTokens)

    // Execute buyback
    uint256[] memory amounts = IUniswapV2Router02(uniswapV2Router).swapExactETHForTokens{value: ethAmount}(
        0, // Accept any amount of CARE (slippage handled off-chain)
        path,
        address(this), // Treasury receives CARE
        block.timestamp + 15 minutes
    );

    // Calculate bought amount
    uint256 careBought = amounts[1];

    // Burn bought CARE (transfer to burn address)
    IERC20(careToken).transfer(address(0), careBought);

    // Update tracking variables
    totalBuybackAmount += ethAmount;
    totalBurnedAmount += careBought;
    buybackFund -= careBought; // Reduce buyback fund by burned amount

    emit BuybackAndBurn(ethAmount, careBought);
}
```

**Gnosis Safe Integration (Off-Chain):**

**Setup Multi-Sig Wallet:**

```javascript
import Safe from '@safe-global/protocol-kit';
import { EthersAdapter } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';

// Deploy Gnosis Safe with 7 signers
const safeAccountConfig = {
    owners: [
        signer1Address,
        signer2Address,
        signer3Address,
        signer4Address,
        signer5Address,
        signer6Address,
        signer7Address
    ],
    threshold: 5 // 5-of-7 required
};

const protocolKit = await Safe.create({
    ethAdapter,
    safeAccountConfig
});

const safeAddress = await protocolKit.getAddress();
console.log("Gnosis Safe deployed at:", safeAddress);

// Set CareTreasury contract as Gnosis Safe module
// This allows on-chain contract to interact with Safe wallet
```

**Propose Transaction (via CareTreasury contract):**

```javascript
// Signer 1 proposes 2M CARE transfer to marketing partner
const tx = await careTreasury.proposeSpending(
    marketingPartnerAddress,
    ethers.utils.parseEther('2000000') // 2M CARE
);

const proposalId = (await tx.wait()).events[0].args.proposalId;
```

**Approve Transaction (via Gnosis Safe UI or SDK):**

```javascript
// Signers 2-5 approve the proposal
await careTreasury.connect(signer2).approveSpending(proposalId);
await careTreasury.connect(signer3).approveSpending(proposalId);
await careTreasury.connect(signer4).approveSpending(proposalId);
await careTreasury.connect(signer5).approveSpending(proposalId);

// Execute (5-of-7 threshold met, amount <10M so no timelock)
await careTreasury.executeSpending(proposalId);
```

**Emergency Governance Control:**

```solidity
function emergencyWithdraw(address token, uint256 amount) external onlyGovernance nonReentrant {
    // Only callable by CareGovernance contract
    // Requires governance proposal approval + 7-day timelock

    IERC20(token).transfer(msg.sender, amount);
    emit EmergencyWithdrawal(token, amount);
}
```

---

## Security Patterns

### Critical Security Checklist

**All Phase 2 Contracts MUST Implement:**

✅ **1. ReentrancyGuard**

- Applied to ALL functions that transfer tokens or modify state before external calls
- Use OpenZeppelin's `ReentrancyGuard` base contract
- Pattern: State changes → External calls (CEI pattern)

✅ **2. Pausable**

- Emergency pause/unpause functions with `onlyOwner` or `onlyGovernance`
- Applied to user-facing functions (stake, claim, vote, etc.)
- Emergency procedures documented

✅ **3. Access Control**

- Use OpenZeppelin's `AccessControl` for role-based permissions
- Roles: `GOVERNANCE_ROLE`, `BACKEND_SIGNER_ROLE`, `TREASURY_ADMIN_ROLE`, `BUYBACK_ROLE`
- Multi-sig control for critical roles

✅ **4. Input Validation**

- Check `amount > 0`, `address != address(0)`, array bounds
- Validate tier/activity IDs are within valid ranges
- Verify signatures and nonces before state changes

✅ **5. Gas Optimization**

- Use `uint96` for token amounts (max ~79B tokens)
- Use `uint32` for timestamps (max year 2106)
- Pack structs to minimize storage slots
- Avoid loops over unbounded arrays

✅ **6. Safe Math**

- Use Solidity 0.8+ (automatic overflow checks)
- OR use OpenZeppelin's `SafeMath` for older versions

✅ **7. Event Emission**

- Emit events for ALL state-changing operations
- Include indexed parameters for filtering
- Follow naming convention: `PascalCase` verbs (e.g., `Staked`, `RewardClaimed`)

✅ **8. External Call Safety**

- Use `transfer()` or `call{value: }` with error handling
- Never assume external calls succeed (check return values)
- Avoid `.send()` (unsafe, can fail silently)

✅ **9. Time-Based Logic**

- Use `block.timestamp` for time checks (not `block.number`)
- Account for block timestamp manipulation (~15 second tolerance)
- Use 32-bit timestamps for storage efficiency

✅ **10. Upgradeability Consideration**

- Consider using UUPS or Transparent Proxy pattern
- If not upgradeable, ensure thorough testing before deployment
- Document upgrade strategy in code comments

### Security Audit Preparation

**Phase 2 Security Audit Scope:**

- All 4 Phase 2 contracts (CareStaking, CareWellness, CareGovernance, CareTreasury)
- Integration with Phase 1 contracts (CareTokenController, CareToken)
- Off-chain components (backend signature generation, Gnosis Safe integration)
- Attack vectors: Reentrancy, signature replay, oracle manipulation, governance attacks

**Recommended Audit Firms:**

1. **OpenZeppelin** - $40K-60K, 4-6 weeks (preferred for OpenZeppelin-based code)
2. **Trail of Bits** - $50K-70K, 6-8 weeks (comprehensive security analysis)
3. **Consensys Diligence** - $45K-65K, 4-6 weeks (DeFi specialization)

**Audit Timeline:**

- Contracts finalized → Submit to audit firm (Week 20)
- Audit in progress → Fix identified issues (Weeks 21-24)
- Re-audit (if needed) → Final report (Weeks 25-26)
- Testnet deployment → Beta testing (Weeks 27-28)
- Mainnet deployment → Public launch (Week 29)

---

## Implementation Roadmap

### Sprint Breakdown (18-20 Weeks Total)

**Sprint 1: CareStaking.sol (Weeks 1-4)**

- Week 1: Contract scaffolding, state variables, tier configuration
- Week 2: Stake/unstake functions, reward calculation logic
- Week 3: Compound interest, early withdrawal penalty, governance integration
- Week 4: Unit tests (100% coverage), integration tests with CareTokenController

**Sprint 2: CareWellness.sol (Weeks 5-10)**

- Week 5: Contract scaffolding, activity configs, state variables
- Week 6: Signature verification, nonce management, cooldown logic
- Week 7: Halving schedule, annual caps, claim function
- Week 8: Backend API integration (Node.js service for signature generation)
- Week 9: Unit tests (100% coverage), signature testing
- Week 10: Integration tests with backend, end-to-end claim flow

**Sprint 3: CareGovernance.sol (Weeks 11-15)**

- Week 11: OpenZeppelin Governor setup, voting parameters
- Week 12: TimelockController integration, proposal functions
- Week 13: Voting rewards, proposal author rewards
- Week 14: ERC20Votes extension on CareToken, voting power from CareStaking
- Week 15: Unit tests, proposal execution tests, Tally integration guide

**Sprint 4: CareTreasury.sol (Weeks 16-18)**

- Week 16: Multi-sig logic, spending tiers, proposal system
- Week 17: Uniswap V2 buyback integration, burn mechanism
- Week 18: Gnosis Safe SDK integration, emergency controls, unit tests

**Sprint 5: Integration & Testing (Weeks 19-20)**

- Week 19: End-to-end integration tests (all 4 contracts + Phase 1 contracts)
- Week 20: Gas optimization, documentation, audit preparation

**Sprint 6: Security Audit (Weeks 21-26)**

- Weeks 21-24: External audit by OpenZeppelin/Trail of Bits
- Weeks 25-26: Fix identified issues, re-audit (if needed)

**Sprint 7: Deployment & Launch (Weeks 27-29)**

- Week 27: Testnet deployment, smart contract verification
- Week 28: Beta testing with 50-100 users, monitoring
- Week 29: Mainnet deployment, public launch announcement

---

## Testing Strategy

### Unit Testing (Per Contract)

**Coverage Requirements:**

- **100% line coverage** (all lines executed)
- **100% branch coverage** (all conditional paths tested)
- **100% function coverage** (all functions called)

**Test Framework:**

- **Hardhat** with **Ethers.js** and **Waffle**
- **Solidity Coverage** plugin for coverage reports
- **Gas Reporter** for gas usage analysis

**Example Test Cases (CareStaking):**

```javascript
describe("CareStaking", function() {
    it("Should stake CARE in Bronze tier", async function() {
        await careToken.approve(careStaking.address, ethers.utils.parseEther('1000'));
        await careStaking.stake(ethers.utils.parseEther('1000'), 0, false); // Tier 0 = Bronze

        expect(await careStaking.totalStaked()).to.equal(ethers.utils.parseEther('1000'));
    });

    it("Should calculate reward correctly for Silver tier", async function() {
        // Stake 10K CARE in Silver (12% APY, 90 days)
        await careStaking.stake(ethers.utils.parseEther('10000'), 1, false);

        // Fast forward 30 days
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        // Expected reward: 10,000 * 0.12 * (30/365) ≈ 98.63 CARE
        const reward = await careStaking.calculateReward(user1.address, 0);
        expect(reward).to.be.closeTo(ethers.utils.parseEther('98.63'), ethers.utils.parseEther('1'));
    });

    it("Should apply early withdrawal penalty", async function() {
        await careStaking.stake(ethers.utils.parseEther('1000'), 0, false); // Bronze, 30 days

        // Unstake after 10 days (early)
        await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
        await careStaking.unstake(0);

        // Expect 10% penalty: 1000 * 0.1 = 100 CARE
        const userBalance = await careToken.balanceOf(user1.address);
        expect(userBalance).to.equal(ethers.utils.parseEther('900')); // 1000 - 100
    });

    it("Should grant voting power for Platinum tier", async function() {
        await careStaking.stake(ethers.utils.parseEther('10000'), 3, false); // Platinum

        const votingPower = await careStaking.getVotingPower(user1.address);
        expect(votingPower).to.equal(ethers.utils.parseEther('10000'));
    });
});
```

### Integration Testing

**Test Scenarios:**

1. **End-to-End Staking → Governance Flow**
   - User stakes 10K CARE in Platinum tier
   - User receives voting power
   - User creates governance proposal
   - User votes on proposal
   - Proposal executes after timelock

2. **Wellness Reward Claim → Staking Flow**
   - User completes CBT module (backend validates)
   - Backend generates signature
   - User claims 100 CARE via CareWellness
   - User stakes claimed CARE in Bronze tier

3. **Treasury Buyback → Burn Flow**
   - Governance approves 1 ETH buyback
   - CareTreasury executes Uniswap swap
   - Bought CARE tokens burned (sent to address(0))
   - Verify totalBurnedAmount updated

4. **Emergency Pause → Recovery Flow**
   - Owner pauses all contracts
   - Users cannot stake/claim/vote
   - Owner fixes issue
   - Owner unpauses contracts
   - Normal operations resume

### Gas Usage Benchmarks

**Target Gas Costs (Optimistic L2 or SOMNIA):**

| Function | Estimated Gas | Target Cost (at 1 gwei) |
|----------|--------------|-------------------------|
| `CareStaking.stake()` | ~150K gas | $0.0001 |
| `CareStaking.unstake()` | ~120K gas | $0.0001 |
| `CareWellness.claimReward()` | ~180K gas | $0.0002 |
| `CareGovernance.propose()` | ~200K gas | $0.0002 |
| `CareGovernance.castVote()` | ~80K gas | $0.00008 |
| `CareTreasury.buybackAndBurn()` | ~250K gas | $0.0003 |

**Gas Optimization Goals:**

- All user functions < 200K gas (except buyback)
- Batch operations supported where applicable
- No unbounded loops in view functions

---

## References

### Research Sources

1. **Synthetix StakingRewards**
   - [GitHub: Aboudoc/Synthetix-Staking-Rewards](https://github.com/Aboudoc/Synthetix-Staking-Rewards)
   - [Speed Run Ethereum: Time-Weighted Staking](https://speedrunethereum.com/guides/time-weighted-staking-rewards)

2. **OpenZeppelin Governor**
   - [GitHub: OpenZeppelin Contracts](https://github.com/openzeppelin/openzeppelin-contracts)
   - [OpenZeppelin Docs: Governance](https://docs.openzeppelin.com/contracts/4.x/governance)
   - [Context7 Library ID: /openzeppelin/openzeppelin-contracts](https://context7.com/openzeppelin/openzeppelin-contracts/llms.txt)

3. **Gnosis Safe**
   - [Medium: Safe (Gnosis Safe) — Smart contract wallets](https://medium.com/@BizthonOfficial/safe-gnosis-safe-smart-contract-wallets-for-teams-daos-a48faf7d352e)
   - [LogRocket: Build treasury wallet with Gnosis Safe](https://blog.logrocket.com/build-treasury-wallet-multisignature-gnosis-safe/)
   - [GitHub: Gnosis Safe Contracts](https://github.com/safe-global/safe-contracts)

4. **Uniswap V2**
   - [RareSkills: Uniswap V2 Mint and Burn](https://rareskills.io/post/uniswap-v2-mint-and-burn)
   - [Blog: Uniswap V2 Contract Implementation](https://blog.blockmagnates.com/uniswap-v2-contract-implementation-6ec8845f6fd6)
   - [Uniswap Docs: Protocol Overview](https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/smart-contracts)

5. **Security Best Practices**
   - [ScienceDirect: Security checklists for Ethereum smart contracts (2025)](https://www.sciencedirect.com/science/article/pii/S2096720925000946)
   - [RapidInnovation: Guide to Developing Staking Smart Contracts](https://www.rapidinnovation.io/post/developing-a-staking-and-unstaking-smart-contract)

### Official Documentation

- **OpenZeppelin Contracts:** <https://docs.openzeppelin.com/contracts/4.x/>
- **Hardhat Testing:** <https://hardhat.org/hardhat-runner/docs/guides/test-contracts>
- **Gnosis Safe SDK:** <https://docs.safe.global/sdk/protocol-kit>
- **Uniswap V2 SDK:** <https://docs.uniswap.org/sdk/v2/overview>
- **Tally Governance UI:** <https://docs.tally.xyz/>

### UGM-AICare Project Docs

- **Phase 1 Contracts:** `blockchain/contracts/phase1/`
- **Gap Analysis:** `docs/CARE_TOKEN/IMPLEMENTATION_GAP_ANALYSIS.md`
- **Tokenomics Specification:** `docs/TOKENOMICS_FINAL.md`
- **Project Single Source of Truth:** `PROJECT_SINGLE_SOURCE_OF_TRUTH.md`

---

## Appendix A: Contract Dependencies

### OpenZeppelin Contracts (v4.9+)

```bash
npm install @openzeppelin/contracts@^4.9.0
```

**Required Imports:**

- `@openzeppelin/contracts/token/ERC20/IERC20.sol`
- `@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol`
- `@openzeppelin/contracts/governance/Governor.sol`
- `@openzeppelin/contracts/governance/extensions/GovernorVotes.sol`
- `@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol`
- `@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol`
- `@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol`
- `@openzeppelin/contracts/governance/TimelockController.sol`
- `@openzeppelin/contracts/utils/ReentrancyGuard.sol`
- `@openzeppelin/contracts/utils/Pausable.sol`
- `@openzeppelin/contracts/access/AccessControl.sol`
- `@openzeppelin/contracts/utils/cryptography/ECDSA.sol`

### Uniswap V2 Periphery

```bash
npm install @uniswap/v2-periphery@^1.1.0
```

**Required Imports:**

- `@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol`

### Gnosis Safe SDK (Off-Chain)

```bash
npm install @safe-global/protocol-kit @safe-global/api-kit ethers
```

---

## Appendix B: Deployment Checklist

**Pre-Deployment (Testnet):**

- [ ] All contracts compiled without errors
- [ ] 100% test coverage achieved
- [ ] Gas usage within target limits
- [ ] Documentation complete (NatSpec comments)
- [ ] Security audit passed
- [ ] Testnet deployment successful
- [ ] Beta testing with 50-100 users
- [ ] No critical bugs reported

**Mainnet Deployment:**

- [ ] Final code review
- [ ] Multi-sig wallet setup (7 signers)
- [ ] CareTokenController roles granted
- [ ] Uniswap V2 liquidity pool created
- [ ] Governance timelock configured
- [ ] Emergency pause keys secured
- [ ] Backend signer key secured (HSM/KMS)
- [ ] Monitoring and alerting configured
- [ ] Public announcement prepared

**Post-Deployment:**

- [ ] Smart contracts verified on block explorer
- [ ] Tally governance UI configured
- [ ] Frontend integration complete
- [ ] User documentation published
- [ ] Community onboarding campaign
- [ ] Bug bounty program launched

---

*For questions or clarifications, contact: [Your Contact Info]*

*Document maintained at: `docs/CARE_TOKEN/PHASE_2_TECHNICAL_SPECIFICATIONS.md`*
