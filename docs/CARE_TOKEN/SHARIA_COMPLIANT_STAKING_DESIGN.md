# Sharia-Compliant CareStaking System - Design Specification

**Document Version:** 1.0  
**Date:** October 28, 2025  
**Status:** Research Complete - Ready for Implementation  
**Compliance:** Based on Malaysian Shariah Advisory Council (SAC SC), AAOIFI Standards, and Binance Sharia Earn

---

## Table of Contents

1. [Islamic Finance Principles](#islamic-finance-principles)
2. [Sharia-Compliant Staking Models](#sharia-compliant-staking-models)
3. [CareStaking Redesign Proposal](#carestaking-redesign-proposal)
4. [Implementation Specifications](#implementation-specifications)
5. [Shariah Certification Process](#shariah-certification-process)
6. [References](#references)

---

## Islamic Finance Principles

### Core Prohibitions

**1. Riba (Interest/Usury) - PROHIBITED ❌**
- **Definition:** Any predetermined return based solely on time (e.g., 5% APY, 12% APY)
- **Why Prohibited:** Exploitative, creates economic inequality, risk-free returns for lender
- **Impact on Original Design:** Current APY-based tier system (5%, 12%, 20%, 35%) is NOT halal

**2. Gharar (Excessive Uncertainty) - MUST AVOID ⚠️**
- **Definition:** Ambiguity or excessive uncertainty in contract terms
- **Requirement:** All terms must be transparent and clearly defined
- **Impact on Design:** Reward distribution must be clear, not random or opaque

**3. Maysir (Gambling/Speculation) - PROHIBITED ❌**
- **Definition:** Purely speculative transactions with no underlying asset or utility
- **Requirement:** Rewards must be tied to real economic activity, not speculation
- **Impact on Design:** Rewards must come from platform revenue/fees, not just token minting

### Permissible Islamic Finance Contracts

**1. Mudarabah (Profit-Sharing Partnership) ✅**
- **Structure:** Capital provider (Rabbul Mal) + Manager (Mudarib)
- **Profit Distribution:** Shared based on pre-agreed ratio (e.g., 70:30)
- **Loss Distribution:** Financial losses borne by capital provider, not manager (unless negligence)
- **Application to Staking:** Users are Rabbul Mal, platform is Mudarib managing staked assets

**2. Musyarakah (Joint Partnership) ✅**
- **Structure:** Two or more parties contribute capital and share profits/losses
- **Profit Distribution:** Based on agreed ratio
- **Loss Distribution:** All partners share losses proportionally
- **Application to Staking:** Users and platform jointly pool capital for platform operations

**3. Wakala (Agency Agreement) ✅**
- **Structure:** Principal appoints agent to manage assets on their behalf
- **Fee Structure:** Agent receives fixed fee or percentage of profits
- **Application to Staking:** Users appoint platform as agent to manage staked tokens
- **Example:** Binance Sharia Earn uses Wakala agreement

**4. Ijarah (Leasing/Service Fee) ✅**
- **Structure:** Service provider charges fee for services rendered
- **Fee Structure:** Fixed fee or performance-based
- **Application to Staking:** Platform charges service fee for managing staked assets

**5. Ju'alah (Reward for Achieving Results) ✅**
- **Structure:** Promise of reward upon completion of specific task/result
- **Application to Staking:** Reward users for achieving specific milestones or participation levels

---

## Sharia-Compliant Staking Models

### Model 1: Mudarabah-Based Profit-Sharing (RECOMMENDED)

**Structure:**
- **Rabbul Mal (Capital Provider):** CARE token holders who stake
- **Mudarib (Manager):** UGM-AICare platform
- **Investment Activity:** Platform uses staked CARE to:
  - Pay for backend services (AI agent processing, database hosting)
  - Provide liquidity for mental health service payments
  - Fund platform operations and development
- **Profit Sources:**
  - Platform transaction fees (wellness activity verification fees)
  - Partner integration fees (therapy providers, universities)
  - NFT achievement badge sales
  - Premium features subscription revenue
  - Treasury investment returns (halal investments only)
- **Profit Distribution:** Pre-agreed ratio (e.g., 80% to stakers, 20% to platform)
- **Loss Handling:** If platform experiences losses (not due to negligence), stakers bear financial loss proportionally

**Example:**
```
Month 1 Platform Revenue: $10,000
- Backend costs: $3,000
- Net profit: $7,000

Profit Distribution (80:20 ratio):
- Stakers receive: $5,600 (80%)
- Platform receives: $1,400 (20%)

Staker Rewards Calculation:
- Total CARE staked: 10M CARE
- User staked: 100K CARE (1% of pool)
- User receives: $56 (1% of $5,600)

Converted to CARE tokens at market price:
- If CARE = $0.01, user receives 5,600 CARE
```

**Shariah Compliance:**
- ✅ NO interest/APY - rewards tied to actual platform profits
- ✅ NO predetermined returns - profit varies based on platform performance
- ✅ Risk-sharing - users bear losses if platform unprofitable
- ✅ Transparency - profit sources and distribution clearly defined
- ✅ Real economic activity - platform generates revenue from services

---

### Model 2: Wakala-Based Agency Fee (Alternative)

**Structure:**
- **Principal:** CARE token holders who stake
- **Agent (Wakil):** UGM-AICare platform
- **Agency Service:** Platform manages staked CARE for platform stability and governance
- **Fee Structure:**
  - **Option A:** Fixed management fee (e.g., 2% annually on staked amount)
  - **Option B:** Performance-based fee (e.g., 10% of platform revenue)
- **Reward Distribution:** Platform shares portion of revenue with stakers after deducting agent fee

**Example (Binance Sharia Earn Model):**
```
Platform Structure:
1. Users stake CARE tokens via Wakala agreement
2. Platform uses staked tokens for liquidity and operations
3. Platform generates revenue from transaction fees
4. Platform distributes profit to stakers (minus 10% Wakala fee)

Month 1:
- Platform revenue: $10,000
- Wakala fee (10%): $1,000
- Distributable to stakers: $9,000
- Total staked: 10M CARE
- Revenue per CARE: $0.0009

User with 100K CARE staked receives: $90
```

**Shariah Compliance:**
- ✅ NO interest - rewards are profit-sharing, not interest
- ✅ Clear agency relationship - platform acts as agent
- ✅ Transparent fee structure - Wakala fee clearly stated
- ✅ Certified by Shariah scholars (if using Binance model as reference)

---

### Model 3: Hybrid Mudarabah + Ijarah (Recommended for UGM-AICare)

**Structure:**
- **Primary Contract:** Mudarabah (profit-sharing on platform revenue)
- **Service Fee:** Ijarah (platform charges service fee for mental health AI services)
- **Reward Tiers:** Based on **participation level** and **contribution**, NOT lock time

**Tier System (Participation-Based, NOT Time-Based):**

| Tier | Requirements | Profit Share | Service Fee Waiver |
|------|-------------|-------------|-------------------|
| **Bronze** | Stake 1K-10K CARE | 60% of profits | 0% |
| **Silver** | Stake 10K-50K CARE + Complete 5 wellness activities | 70% of profits | 25% fee waiver |
| **Gold** | Stake 50K-100K CARE + Complete 15 wellness activities | 80% of profits | 50% fee waiver |
| **Platinum** | Stake 100K+ CARE + Complete 30 wellness activities + Participate in governance | 90% of profits | 75% fee waiver |

**Key Differences from Original Design:**
- ❌ **Removed:** APY percentages (5%, 12%, 20%, 35%) - these are riba
- ✅ **Added:** Profit-sharing ratios tied to platform performance
- ❌ **Removed:** Lock periods (30d, 90d, 180d, 365d) - unnecessary for Shariah compliance
- ✅ **Added:** Participation requirements (wellness activities completed)
- ✅ **Added:** Service fee waivers as incentive (Ijarah-compliant)
- ✅ **Keep:** Voting power for Platinum tier (governance participation)

**Profit Sources for Distribution:**
1. **Transaction Fees:** Platform charges 2% on wellness reward claims (users pay to verify activities)
2. **Partner Integration Fees:** Universities/therapy centers pay to integrate with platform
3. **NFT Badge Sales:** Users purchase achievement NFT badges
4. **Premium Features:** Subscription for advanced AI coaching ($5/month)
5. **Treasury Investments:** Halal investments (Sukuk, halal stocks) generate returns

**Example Calculation:**
```
Month 1 Platform Financials:
- Transaction fees collected: $3,000
- Partner integration fees: $2,000
- NFT badge sales: $1,500
- Premium subscriptions: $1,000
- Treasury investment returns: $500
- Total Revenue: $8,000

Expenses:
- Backend costs (AI, hosting): $2,000
- Developer salaries: $3,000
- Total Expenses: $5,000

Net Profit: $3,000

Profit Distribution by Tier:
- Total CARE staked: 10M CARE
  - Bronze: 5M CARE (50%)
  - Silver: 3M CARE (30%)
  - Gold: 1.5M CARE (15%)
  - Platinum: 0.5M CARE (5%)

Bronze Tier (60% profit share):
- Eligible for: $3,000 × 60% × 50% = $900
- Per CARE: $900 / 5M = $0.00018 per CARE
- User with 10K CARE: $1.80

Silver Tier (70% profit share):
- Eligible for: $3,000 × 70% × 30% = $630
- Per CARE: $630 / 3M = $0.00021 per CARE
- User with 20K CARE: $4.20

Gold Tier (80% profit share):
- Eligible for: $3,000 × 80% × 15% = $360
- Per CARE: $360 / 1.5M = $0.00024 per CARE
- User with 50K CARE: $12.00

Platinum Tier (90% profit share):
- Eligible for: $3,000 × 90% × 5% = $135
- Per CARE: $135 / 0.5M = $0.00027 per CARE
- User with 100K CARE: $27.00
```

**Shariah Compliance:**
- ✅ Profits tied to actual platform revenue (real economic activity)
- ✅ No predetermined returns (varies monthly based on performance)
- ✅ Risk-sharing (if platform unprofitable, no rewards distributed)
- ✅ Participation-based tiers (rewards active users, not just time-locked capital)
- ✅ Service fee structure (Ijarah) for platform operations
- ✅ Transparent profit distribution formula

---

## CareStaking Redesign Proposal

### Contract Name: `CareStakingHalal.sol`

### Overview

**Allocation:** 150M CARE (unchanged)  
**Monthly Distribution Cap:** Based on platform profit, not fixed mint cap  
**Estimated LOC:** ~600 lines (more complex than APY-based)  
**Dependencies:** OpenZeppelin, CareTokenController, Platform Revenue Oracle

### Key Design Changes

**REMOVED (Non-Halal Elements):**
- ❌ APY-based rewards (5%, 12%, 20%, 35%)
- ❌ Predetermined interest rates
- ❌ Time-based reward calculations (annual rate × time staked)
- ❌ Compound interest terminology

**ADDED (Sharia-Compliant Elements):**
- ✅ Mudarabah profit-sharing contract
- ✅ Platform revenue oracle (reports monthly profits)
- ✅ Participation-based tier system (wellness activity completion)
- ✅ Transparent profit distribution ratios
- ✅ Risk-sharing mechanism (no profit = no rewards)
- ✅ Wakala fee structure for platform services
- ✅ Monthly profit settlement periods
- ✅ Shariah board oversight integration

### State Variables

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CareStakingHalal is ReentrancyGuard, Pausable, AccessControl {
    // ========== STRUCTS ==========
    
    struct StakeTier {
        uint256 minStakeAmount;      // Minimum CARE to stake for this tier
        uint16 profitShareBPS;       // Profit share in basis points (e.g., 6000 = 60%)
        uint16 serviceFeeWaiverBPS;  // Service fee waiver (e.g., 2500 = 25%)
        uint8 minWellnessActivities; // Required wellness activities completed
        uint256 totalStaked;         // Total CARE staked in this tier
    }

    struct UserStake {
        uint96 amount;               // Staked amount
        uint32 startTime;            // Stake start timestamp
        uint32 lastClaimTime;        // Last profit claim timestamp
        uint8 tier;                  // 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
        uint16 wellnessActivitiesCompleted; // Total wellness activities completed
        uint256 unclaimedProfit;     // Unclaimed profit in CARE
    }

    struct MonthlyProfit {
        uint256 totalRevenue;        // Platform revenue for the month
        uint256 totalExpenses;       // Platform expenses for the month
        uint256 netProfit;           // Revenue - Expenses
        uint256 distributedAmount;   // Total CARE distributed to stakers
        uint32 settlementTime;       // When profit was settled
        bool settled;                // Whether month has been settled
    }

    // ========== STATE VARIABLES ==========
    
    // Tier configurations
    mapping(uint8 => StakeTier) public stakeTiers;
    
    // User stakes
    mapping(address => UserStake[]) public userStakes;
    
    // Monthly profit tracking
    mapping(uint256 => MonthlyProfit) public monthlyProfits; // yearMonth => MonthlyProfit
    uint256 public currentMonth; // Format: YYYYMM (e.g., 202510 = October 2025)
    
    // Platform contracts
    IERC20 public careToken;
    address public careTokenController;
    address public platformRevenueOracle; // Reports monthly revenue/expenses
    address public shariahBoard;          // Shariah board oversight
    
    // Totals
    uint256 public totalStaked;
    uint256 public totalProfitDistributed;
    
    // Roles
    bytes32 public constant REVENUE_ORACLE_ROLE = keccak256("REVENUE_ORACLE_ROLE");
    bytes32 public constant SHARIAH_BOARD_ROLE = keccak256("SHARIAH_BOARD_ROLE");
    
    // Constants
    uint256 public constant WAKALA_FEE_BPS = 1000; // 10% platform Wakala fee
    uint256 public constant ALLOCATION = 150_000_000e18; // 150M CARE
    
    // ========== EVENTS ==========
    
    event Staked(address indexed user, uint256 amount, uint8 tier);
    event Unstaked(address indexed user, uint256 amount, uint8 tier);
    event ProfitClaimed(address indexed user, uint256 amount, uint256 month);
    event MonthlyProfitSettled(uint256 month, uint256 netProfit, uint256 distributedAmount);
    event TierUpgraded(address indexed user, uint8 oldTier, uint8 newTier);
    event WellnessActivityRecorded(address indexed user, uint256 activityCount);
    
    // ========== CONSTRUCTOR ==========
    
    constructor(
        address _careToken,
        address _careTokenController,
        address _platformRevenueOracle,
        address _shariahBoard
    ) {
        careToken = IERC20(_careToken);
        careTokenController = _careTokenController;
        platformRevenueOracle = _platformRevenueOracle;
        shariahBoard = _shariahBoard;
        
        // Initialize tiers (participation-based, NOT time-based)
        stakeTiers[0] = StakeTier({
            minStakeAmount: 1_000e18,      // 1K CARE minimum
            profitShareBPS: 6000,          // 60% profit share
            serviceFeeWaiverBPS: 0,        // 0% fee waiver
            minWellnessActivities: 0,      // No activity requirement
            totalStaked: 0
        });
        
        stakeTiers[1] = StakeTier({
            minStakeAmount: 10_000e18,     // 10K CARE minimum
            profitShareBPS: 7000,          // 70% profit share
            serviceFeeWaiverBPS: 2500,     // 25% fee waiver
            minWellnessActivities: 5,      // 5 activities required
            totalStaked: 0
        });
        
        stakeTiers[2] = StakeTier({
            minStakeAmount: 50_000e18,     // 50K CARE minimum
            profitShareBPS: 8000,          // 80% profit share
            serviceFeeWaiverBPS: 5000,     // 50% fee waiver
            minWellnessActivities: 15,     // 15 activities required
            totalStaked: 0
        });
        
        stakeTiers[3] = StakeTier({
            minStakeAmount: 100_000e18,    // 100K CARE minimum
            profitShareBPS: 9000,          // 90% profit share
            serviceFeeWaiverBPS: 7500,     // 75% fee waiver
            minWellnessActivities: 30,     // 30 activities required
            totalStaked: 0
        });
        
        // Set initial month (October 2025)
        currentMonth = 202510;
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REVENUE_ORACLE_ROLE, _platformRevenueOracle);
        _grantRole(SHARIAH_BOARD_ROLE, _shariahBoard);
    }
    
    // ========== STAKING FUNCTIONS ==========
    
    function stake(uint256 amount, uint8 tier) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(tier < 4, "Invalid tier");
        
        StakeTier memory tierConfig = stakeTiers[tier];
        require(amount >= tierConfig.minStakeAmount, "Below minimum stake for tier");
        
        // Check wellness activity requirement
        uint256 userActivityCount = getUserWellnessActivityCount(msg.sender);
        require(
            userActivityCount >= tierConfig.minWellnessActivities,
            "Insufficient wellness activities for tier"
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
    
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        UserStake memory userStake = userStakes[msg.sender][stakeIndex];
        require(userStake.amount > 0, "Stake already withdrawn");
        
        // Claim any unclaimed profits first
        if (userStake.unclaimedProfit > 0) {
            _claimProfit(msg.sender, stakeIndex);
        }
        
        uint256 unstakeAmount = userStake.amount;
        uint8 tier = userStake.tier;
        
        // Transfer CARE back to user
        careToken.transfer(msg.sender, unstakeAmount);
        
        // Update state
        stakeTiers[tier].totalStaked -= unstakeAmount;
        totalStaked -= unstakeAmount;
        
        // Remove stake (swap with last and pop)
        uint256 lastIndex = userStakes[msg.sender].length - 1;
        if (stakeIndex != lastIndex) {
            userStakes[msg.sender][stakeIndex] = userStakes[msg.sender][lastIndex];
        }
        userStakes[msg.sender].pop();
        
        emit Unstaked(msg.sender, unstakeAmount, tier);
    }
    
    // ========== PROFIT DISTRIBUTION ==========
    
    function settleMonthlyProfit(
        uint256 month,
        uint256 totalRevenue,
        uint256 totalExpenses
    ) external onlyRole(REVENUE_ORACLE_ROLE) {
        require(month == currentMonth, "Can only settle current month");
        require(!monthlyProfits[month].settled, "Month already settled");
        require(totalRevenue >= totalExpenses, "Revenue must exceed expenses");
        
        uint256 netProfit = totalRevenue - totalExpenses;
        
        // Deduct Wakala fee (10% platform fee)
        uint256 wakalaFee = (netProfit * WAKALA_FEE_BPS) / 10000;
        uint256 distributableProfit = netProfit - wakalaFee;
        
        // Calculate profit per tier
        uint256 totalDistributed = 0;
        
        for (uint8 tier = 0; tier < 4; tier++) {
            StakeTier memory tierConfig = stakeTiers[tier];
            if (tierConfig.totalStaked > 0) {
                // Tier's share = distributableProfit × profitShareRatio × (tierStaked / totalStaked)
                uint256 tierShare = (distributableProfit * tierConfig.profitShareBPS * tierConfig.totalStaked) 
                                  / (10000 * totalStaked);
                totalDistributed += tierShare;
                
                // Will be distributed pro-rata to users when they claim
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
    
    function claimProfit(uint256 stakeIndex) external nonReentrant {
        _claimProfit(msg.sender, stakeIndex);
    }
    
    function _claimProfit(address user, uint256 stakeIndex) internal {
        require(stakeIndex < userStakes[user].length, "Invalid stake index");
        
        UserStake storage userStake = userStakes[user][stakeIndex];
        
        // Calculate unclaimed profit from previous months
        uint256 unclaimedProfit = calculateUnclaimedProfit(user, stakeIndex);
        require(unclaimedProfit > 0, "No profit to claim");
        
        // Mint CARE tokens via CareTokenController
        ICareTokenController(careTokenController).mintFromCategory(
            STAKING_CATEGORY,
            user,
            unclaimedProfit
        );
        
        // Update state
        userStake.lastClaimTime = uint32(block.timestamp);
        userStake.unclaimedProfit = 0;
        totalProfitDistributed += unclaimedProfit;
        
        emit ProfitClaimed(user, unclaimedProfit, currentMonth);
    }
    
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
                // Calculate user's share of tier profit for this month
                // userProfit = monthlyDistributed × profitShareRatio × (userStaked / tierStaked)
                uint256 userShare = (monthProfit.distributedAmount * tierConfig.profitShareBPS * userStake.amount) 
                                  / (10000 * tierConfig.totalStaked);
                totalProfit += userShare;
            }
            
            checkMonth = _incrementMonth(checkMonth);
        }
        
        return totalProfit;
    }
    
    // ========== WELLNESS ACTIVITY INTEGRATION ==========
    
    function recordWellnessActivity(address user) external {
        // Only callable by CareWellness contract
        require(msg.sender == careWellnessContract, "Only CareWellness");
        
        // Update activity count for all user's stakes
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
            
            // Check if eligible for higher tier
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
    
    // ========== VIEW FUNCTIONS ==========
    
    function getUserWellnessActivityCount(address user) public view returns (uint256) {
        // Query CareWellness contract for user's total activities
        // Placeholder - implement integration
        return 0;
    }
    
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
    
    function getUserStakes(address user) external view returns (UserStake[] memory) {
        return userStakes[user];
    }
    
    function getMonthlyProfit(uint256 month) external view returns (MonthlyProfit memory) {
        return monthlyProfits[month];
    }
    
    // ========== HELPER FUNCTIONS ==========
    
    function _incrementMonth(uint256 month) internal pure returns (uint256) {
        uint256 year = month / 100;
        uint256 monthNum = month % 100;
        
        monthNum++;
        if (monthNum > 12) {
            year++;
            monthNum = 1;
        }
        
        return year * 100 + monthNum;
    }
    
    function _getMonthFromTimestamp(uint256 timestamp) internal pure returns (uint256) {
        // Convert timestamp to YYYYMM format
        // Placeholder - implement date conversion
        return 202510;
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function updateTierConfig(
        uint8 tier,
        uint256 minStakeAmount,
        uint16 profitShareBPS,
        uint16 serviceFeeWaiverBPS,
        uint8 minWellnessActivities
    ) external onlyRole(SHARIAH_BOARD_ROLE) {
        // Only Shariah board can modify tier configs to ensure compliance
        require(tier < 4, "Invalid tier");
        
        stakeTiers[tier].minStakeAmount = minStakeAmount;
        stakeTiers[tier].profitShareBPS = profitShareBPS;
        stakeTiers[tier].serviceFeeWaiverBPS = serviceFeeWaiverBPS;
        stakeTiers[tier].minWellnessActivities = minWellnessActivities;
    }
}
```

---

## Implementation Specifications

### Smart Contract Changes

**New Contracts Required:**
1. **PlatformRevenueOracle.sol** - Reports monthly revenue/expenses
   - Backend service pushes financial data
   - Requires multi-sig approval (3-of-5 finance team)
   - Auditable on-chain records

2. **ShariahBoard.sol** - Shariah compliance oversight
   - Board members can pause contracts if non-compliant
   - Approve tier configuration changes
   - Issue compliance certificates

**Modified Contracts:**
1. **CareWellness.sol** - Must notify CareStaking when user completes activity
2. **CareGovernance.sol** - Query CareStaking for Platinum tier voting power

### Backend Integration

**Revenue Tracking Service:**
```javascript
// backend/services/revenueTracker.js
class RevenueTracker {
    async calculateMonthlyProfit(year, month) {
        // 1. Query all revenue sources
        const transactionFees = await this.getTransactionFees(year, month);
        const partnerFees = await this.getPartnerIntegrationFees(year, month);
        const nftSales = await this.getNFTSales(year, month);
        const subscriptions = await this.getSubscriptionRevenue(year, month);
        const treasuryReturns = await this.getTreasuryReturns(year, month);
        
        const totalRevenue = transactionFees + partnerFees + nftSales + subscriptions + treasuryReturns;
        
        // 2. Query all expenses
        const backendCosts = await this.getBackendCosts(year, month);
        const salaries = await this.getSalaries(year, month);
        const infrastructureCosts = await this.getInfrastructureCosts(year, month);
        
        const totalExpenses = backendCosts + salaries + infrastructureCosts;
        
        // 3. Submit to blockchain (requires multi-sig approval)
        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            month: year * 100 + month
        };
    }
    
    async submitToBlockchain(profitData) {
        // Convert to CARE token equivalent
        const carePrice = await this.getCareTokenPrice();
        const revenueInCare = (profitData.totalRevenue / carePrice);
        const expensesInCare = (profitData.totalExpenses / carePrice);
        
        // Create transaction for multi-sig approval
        const tx = await careStakingHalal.populateTransaction.settleMonthlyProfit(
            profitData.month,
            ethers.utils.parseEther(revenueInCare.toString()),
            ethers.utils.parseEther(expensesInCare.toString())
        );
        
        // Submit to multi-sig wallet (3-of-5 finance team)
        await multiSigWallet.submitTransaction(tx);
    }
}
```

### Frontend Display

**Staking Dashboard (Sharia-Compliant):**
```typescript
// frontend/components/StakingDashboard.tsx
export function StakingDashboard() {
    return (
        <div className="staking-dashboard">
            <h1>Halal Staking (Mudarabah Agreement)</h1>
            
            {/* Shariah Compliance Badge */}
            <div className="compliance-badge">
                <ShieldCheckIcon />
                <span>Shariah-Compliant | Certified by [Shariah Board Name]</span>
            </div>
            
            {/* Tier Selection (NO APY displayed) */}
            <div className="tier-cards">
                <TierCard
                    name="Bronze"
                    minStake="1,000 CARE"
                    profitShare="60%"
                    feeWaiver="0%"
                    activities="0 required"
                />
                <TierCard
                    name="Silver"
                    minStake="10,000 CARE"
                    profitShare="70%"
                    feeWaiver="25%"
                    activities="5 required"
                />
                <TierCard
                    name="Gold"
                    minStake="50,000 CARE"
                    profitShare="80%"
                    feeWaiver="50%"
                    activities="15 required"
                />
                <TierCard
                    name="Platinum"
                    minStake="100,000 CARE"
                    profitShare="90%"
                    feeWaiver="75%"
                    activities="30 required"
                    votingPower="Yes"
                />
            </div>
            
            {/* Monthly Profit Display (NOT APY) */}
            <div className="profit-tracker">
                <h2>Last Month's Platform Profit</h2>
                <p>Total Revenue: $10,000</p>
                <p>Total Expenses: $5,000</p>
                <p>Net Profit: $5,000</p>
                <p>Your Share (Bronze, 1K CARE): $1.80</p>
                
                <button onClick={claimProfit}>Claim Your Profit Share</button>
            </div>
            
            {/* Mudarabah Agreement Disclosure */}
            <div className="legal-disclosure">
                <h3>Mudarabah Agreement Terms</h3>
                <p>By staking CARE tokens, you enter into a Mudarabah (profit-sharing) agreement where:</p>
                <ul>
                    <li>You (Rabbul Mal) provide capital by staking CARE tokens</li>
                    <li>UGM-AICare platform (Mudarib) manages your staked assets</li>
                    <li>Profits are shared based on your tier's profit-sharing ratio</li>
                    <li>You bear financial losses if platform is unprofitable (not due to negligence)</li>
                    <li>Platform charges 10% Wakala (agency) fee on profits</li>
                    <li>Rewards vary monthly based on platform performance (no guaranteed returns)</li>
                </ul>
                
                <p><strong>Shariah Compliance:</strong> This staking mechanism has been reviewed and deemed compliant with Islamic finance principles by [Shariah Board Name]. It avoids riba (interest), gharar (uncertainty), and maysir (gambling).</p>
            </div>
        </div>
    );
}
```

---

## Shariah Certification Process

### Steps to Obtain Certification

**1. Prepare Documentation (2-3 weeks)**
- Smart contract code with inline comments explaining Shariah compliance
- Technical whitepaper explaining Mudarabah structure
- Financial model showing profit sources (real economic activity)
- Risk disclosure documents
- User agreement templates (Mudarabah terms)

**2. Submit to Shariah Advisory Board (1 week)**
Recommended boards:
- **AAOIFI** (Accounting and Auditing Organization for Islamic Financial Institutions)
- **Malaysia Shariah Advisory Council (SAC)**
- **Dubai Islamic Economy Development Centre**
- **Amanie Advisors** (specialized in Islamic fintech)

**3. Review Process (4-6 weeks)**
- Board reviews contracts, terms, and financial structure
- May request modifications to ensure full compliance
- Iterative review cycles until approved

**4. Certification Issuance (1 week)**
- Receive Shariah compliance certificate
- Certificate valid for 1-2 years (requires annual re-certification)
- Display certificate on platform and in smart contracts

**5. Ongoing Compliance (Continuous)**
- Monthly financial reporting to Shariah board
- Quarterly compliance audits
- Annual re-certification process

### Estimated Costs

| Item | Cost (USD) |
|------|-----------|
| Initial Shariah Board consultation | $5,000 - $10,000 |
| Full certification review | $15,000 - $30,000 |
| Smart contract Shariah audit | $10,000 - $20,000 |
| Annual re-certification | $5,000 - $10,000 |
| **Total Year 1** | **$35,000 - $70,000** |
| **Annual (Years 2+)** | **$5,000 - $10,000** |

---

## Migration Plan from Original Design

### Option 1: Hard Fork (Clean Break)

**Deploy CareStakingHalal.sol as separate contract:**
- Users migrate stakes from old CareStaking to new CareStakingHalal
- Old contract frozen (no new stakes)
- 30-day migration period
- Unclaimed APY rewards from old contract can still be claimed

**Pros:**
- Clean separation of halal/non-halal systems
- No code pollution with backwards compatibility
- Clear messaging: "We're now Shariah-compliant"

**Cons:**
- User friction (manual migration required)
- Two contracts to maintain during transition

### Option 2: Gradual Transition (Coexistence)

**Deploy CareStakingHalal.sol alongside original CareStaking.sol:**
- Users can choose which system to use
- Original CareStaking continues for non-Muslim users or those preferring APY
- CareStakingHalal for Muslim users and ethical investors

**Pros:**
- No forced migration
- Users have choice
- Gradual adoption

**Cons:**
- Two systems to maintain long-term
- Splits liquidity and governance power
- Confusing messaging ("which one should I use?")

### Recommendation: **Option 1 (Hard Fork)** with 60-day transition

**Reasons:**
1. **Ethical Leadership:** Clear commitment to Shariah compliance
2. **Unified Community:** One staking system for all users
3. **Simpler Long-Term:** No dual-system complexity
4. **Broader Appeal:** Ethical finance attracts non-Muslims too (ESG investors)
5. **Marketing Advantage:** "First Shariah-certified mental health DeFi platform"

---

## References

### Research Sources

1. **Malaysian Shariah Advisory Council (SAC SC)**
   - [Sharlife.my: Is Staking Crypto Halal?](https://sharlife.my/article/content/Is_Staking_Crypto_Halal)
   - **Key Findings:** Mudarabah and Musyarakah contracts applicable to staking

2. **Binance Sharia Earn**
   - [Coin Bureau: Binance Sharia Earn Review](https://coinbureau.com/review/binance-sharia-earn-review/)
   - [Binance Official: Sharia Earn Launch](https://www.binance.com/en/support/announcement/detail/60d4f5891ebe4e3590a5c14f0f07ca29)
   - **Key Findings:** Wakala agreement structure, certified by Shariah scholars

3. **Islamic DeFi Platforms**
   - [Inshallah.fi](https://launchy.app/insights/inshallah-fi-shariah-compliant-defi-on-solana) - Halal staking on Solana
   - [Haqq Network](https://medium.com/@jelilat/bridging-islamic-finance-and-defi-a-journey-toward-shariah-compliant-crypto-solutions-ad4e09c081cd) - $ISLM Coin
   - **Key Findings:** Zero-interest lending, profit-sharing models

4. **Islamic Finance Principles**
   - [Fintech Weekly: Islamic DeFi Explained](https://www.fintechweekly.com/magazine/articles/islamic-decentralized-finance-defi-explained)
   - **Key Findings:** Prohibition of riba, gharar, maysir; use of Mudarabah, Murabaha, Ijarah

5. **AAOIFI Standards**
   - Shariah Standard No. 12: Mudarabah contracts
   - Allows in-kind capital contribution (crypto tokens)

### Shariah Advisory Contacts

**Recommended Shariah Boards:**
1. **Amanie Advisors** (Malaysia/UAE)
   - Email: info@amanieadvisors.com
   - Specialization: Islamic fintech and DeFi

2. **Yasaar Research Institute** (USA)
   - Website: yasaar.org
   - Specialization: Halal cryptocurrency guidance

3. **Shariyah Review Bureau** (Bahrain)
   - Website: www.shariyah.com
   - Specialization: Islamic finance certification

---

## Conclusion

**The original CareStaking design with APY-based rewards (5%, 12%, 20%, 35%) is NOT Shariah-compliant due to riba (interest) prohibition.**

**The redesigned CareStakingHalal.sol addresses this by:**
- ✅ Using **Mudarabah (profit-sharing)** instead of interest
- ✅ Tying rewards to **real platform revenue** (transaction fees, subscriptions, etc.)
- ✅ Implementing **risk-sharing** (no profit if platform unprofitable)
- ✅ Replacing time-based APY with **participation-based profit shares**
- ✅ Using **Wakala (agency fee)** for platform services
- ✅ Ensuring **transparency** in profit distribution
- ✅ Enabling **Shariah board oversight** through on-chain governance

**Next Steps:**
1. Review this specification with your team and Islamic finance advisor
2. Decide on migration approach (Hard Fork vs Coexistence)
3. Begin development of CareStakingHalal.sol (~600 LOC)
4. Prepare documentation for Shariah board submission
5. Budget $35K-70K for Year 1 certification costs

**Timeline Estimate:**
- Development: 4-5 weeks
- Shariah certification: 6-8 weeks
- Testing & deployment: 2-3 weeks
- **Total:** ~3-4 months for halal staking system

---

**For questions or further clarification, contact your Islamic finance advisor or Shariah board representative.**

**Document maintained at:** `docs/CARE_TOKEN/SHARIA_COMPLIANT_STAKING_DESIGN.md`

---

**END OF DOCUMENT**
