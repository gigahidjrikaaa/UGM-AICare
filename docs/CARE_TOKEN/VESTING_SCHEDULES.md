# CARE Token Vesting Schedules - Complete Reference

**Version 1.0 - October 27, 2025**

This document provides detailed vesting schedules for all token allocations, including unlock timelines, formulas, and rationale.

---

## 📋 Vesting Overview Table

| Category | Total Tokens | Vesting Type | Duration | Cliff | TGE % | Monthly Unlock | Full Release |
|----------|--------------|--------------|----------|-------|-------|----------------|--------------|
| **Community** | 350M | Mixed | Varies | None | 10% | Varies | Years 1-5 |
| → Airdrops | 100M | Linear | 12 months | None | 25% | 6.25M | Dec 2026 |
| → Staking Rewards | 150M | Earned | 48 months | N/A | 0% | 3.125M | Oct 2029 |
| → Governance | 50M | Earned | On-demand | N/A | 0% | N/A | Ongoing |
| → Events | 50M | Event-based | On-demand | N/A | 0% | N/A | Ongoing |
| **Wellness** | 200M | Earned | 10+ years | N/A | 0% | Varies | Year 10+ |
| → CBT/Therapy | 100M | Activity | Halving | N/A | 0% | 4.17M Y1 | Year 8+ |
| → Daily Engagement | 70M | Daily | Halving | N/A | 0% | 2.92M Y1 | Year 8+ |
| → Milestones | 30M | Achievement | Halving | N/A | 0% | 1.25M Y1 | Year 8+ |
| **Team** | 130M | Linear | 48 months | 12 months | 0% | 2.71M* | Oct 2029 |
| → Developers | 60M | Linear | 48 months | 12 months | 0% | 1.25M* | Oct 2029 |
| → Business/Marketing | 40M | Linear | 48 months | 12 months | 0% | 833K* | Oct 2029 |
| → Advisors | 30M | Linear | 24 months | 6 months | 0% | 1.25M* | Apr 2027 |
| **Partners** | 100M | Linear | 24 months | 3-6 months | 10% | 3.75M* | Oct 2027 |
| → Merchants | 60M | Linear | 24 months | 3 months | 10% | 2.57M* | Jul 2027 |
| → Clinical | 40M | Linear | 24 months | 6 months | 10% | 1.78M* | Oct 2027 |
| **Treasury** | 100M | On-demand | N/A | N/A | 30% | Budget | Ongoing |
| **Liquidity** | 80M | Locked | 24 months | N/A | 62.5% | 0 | Oct 2027 |
| **Grants** | 40M | Project | On-demand | N/A | 0% | 833K | Year 4 |

*After cliff period ends

---

## 🔵 Community Allocation (350M CARE)

### Airdrops (100M) - 12-Month Linear Vesting

**Vesting Formula**:

```
unlocked_tokens = total_allocation * (months_elapsed / 12)
```

**Release Schedule**:

| Month | Pre-Launch | Testnet | Beta Users | Referrals | Monthly Total | Cumulative |
|-------|-----------|---------|------------|-----------|---------------|------------|
| 0 (TGE) | 30M (100%) | 20M (100%) | 15M (50%) | 20M (100%) | 85M | 85M |
| 1 | 0 | 0 | 2.5M | 0 | 2.5M | 87.5M |
| 2 | 0 | 0 | 2.5M | 0 | 2.5M | 90M |
| 3 | 0 | 0 | 2.5M | 0 | 2.5M | 92.5M |
| 4 | 0 | 0 | 2.5M | 0 | 2.5M | 95M |
| 5 | 0 | 0 | 2.5M | 0 | 2.5M | 97.5M |
| 6 | 0 | 0 | 2.5M | 0 | 2.5M | **100M** ✅ |

**Rationale**:

- Pre-launch and testnet: Immediate unlock (reward early supporters)
- Beta users: 6-month vesting (incentivize continued usage)
- Referrals: Instant (encourage viral growth)

---

### Staking Rewards (150M) - 4-Year Distribution

**Distribution Rate**: 37.5M CARE per year (3.125M per month)

**Allocation by Tier**:

| Stake Duration | Pool Size | APY | Est. Usage | Annual Distribution |
|----------------|-----------|-----|------------|---------------------|
| 30 days | 30M | 5% | 25% of stakers | 9.375M |
| 90 days | 40M | 12% | 35% of stakers | 13.125M |
| 180 days | 40M | 20% | 25% of stakers | 9.375M |
| 365 days | 40M | 35% | 15% of stakers | 5.625M |
| **Total** | **150M** | - | - | **37.5M/year** |

**Minting Schedule** (Smart Contract):

```solidity
// Staking rewards minted on-demand, capped per period
uint256 public constant MAX_MONTHLY_STAKE_REWARDS = 3_125_000 * 10**18;
uint256 public monthlyStakeRewardsMinted;
uint256 public lastResetTimestamp;

function mintStakingReward(address staker, uint256 amount) external {
    if (block.timestamp - lastResetTimestamp >= 30 days) {
        monthlyStakeRewardsMinted = 0;
        lastResetTimestamp = block.timestamp;
    }
    
    require(
        monthlyStakeRewardsMinted + amount <= MAX_MONTHLY_STAKE_REWARDS,
        "Monthly staking cap reached"
    );
    
    monthlyStakeRewardsMinted += amount;
    _mint(staker, amount);
}
```

**Example APY Calculation**:

```
User stakes: 100,000 CARE for 365 days at 35% APY

Daily reward = 100,000 * 0.35 / 365 = 95.89 CARE/day
Monthly reward = 95.89 * 30 = 2,877 CARE/month
Annual reward = 35,000 CARE
Total after 1 year = 135,000 CARE
```

---

### Governance (50M) - Earned via Participation

**Reward Structure**:

| Activity | Reward | Annual Cap | Est. Participants | Total Annual |
|----------|--------|------------|-------------------|--------------|
| Vote on proposal | 50 CARE | 100 proposals | 1,000 voters | 5M CARE |
| Create proposal (approved) | 1,000 CARE | 50 proposals | 50 creators | 50K CARE |
| Council election vote | 100 CARE | 4 elections | 5,000 voters | 2M CARE |
| **Total** | - | - | - | **~7M CARE/year** |

**Distribution Timeline**: 50M pool lasts ~7 years at 7M/year

---

### Community Events (50M) - Event-Based

**Event Types**:

| Event | Frequency | Prize Pool | Winners | Annual Total |
|-------|-----------|------------|---------|--------------|
| Quarterly Competition | 4/year | 1M CARE | 100 | 4M CARE |
| Bug Bounty | Ongoing | 50K-500K | 20-30 | 3M CARE |
| Ambassador Program | Monthly | 125K CARE | 50 | 1.5M CARE |
| Hackathon (Annual) | 1/year | 2M CARE | 20 teams | 2M CARE |
| **Total** | - | - | - | **~10.5M/year** |

**Distribution Timeline**: 50M pool lasts ~5 years at 10.5M/year

---

## 💚 Wellness Allocation (200M CARE)

### Halving Schedule (Bitcoin-Inspired)

**Base Rewards**:

| Period | Base Reward/Activity | Annual Distribution | % of Pool |
|--------|---------------------|---------------------|-----------|
| Year 1 (Oct 2025 - Oct 2026) | 100 CARE | 50M | 25% |
| Year 2 (Oct 2026 - Oct 2027) | 50 CARE | 25M | 12.5% |
| Year 3 (Oct 2027 - Oct 2028) | 25 CARE | 12.5M | 6.25% |
| Year 4 (Oct 2028 - Oct 2029) | 12.5 CARE | 6.25M | 3.125% |
| Year 5 (Oct 2029 - Oct 2030) | 6.25 CARE | 3.125M | 1.56% |
| Year 6-10+ | 3.125 → 1.5 CARE | <3M/year | <1.5%/year |

**Cumulative Distribution**:

- 4 years: ~94M distributed (47% of pool)
- 8 years: ~130M distributed (65% of pool)
- 10+ years: Full 200M distributed

**Smart Contract Implementation**:

```solidity
uint256 public constant INITIAL_REWARD = 100 * 10**18; // 100 CARE
uint256 public constant HALVING_INTERVAL = 365 days;
uint256 public launchTimestamp;

function getCurrentReward() public view returns (uint256) {
    uint256 timeSinceLaunch = block.timestamp - launchTimestamp;
    uint256 halvingsElapsed = timeSinceLaunch / HALVING_INTERVAL;
    
    // Reward = 100 / (2^halvings)
    // Year 1: 100, Year 2: 50, Year 3: 25, etc.
    return INITIAL_REWARD / (2 ** halvingsElapsed);
}

function rewardActivity(address user, string memory activityType) external {
    uint256 reward = getCurrentReward();
    
    // Apply activity-specific multipliers
    if (keccak256(bytes(activityType)) == keccak256("cbt_module")) {
        reward = reward; // 1x (full reward)
    } else if (keccak256(bytes(activityType)) == keccak256("daily_checkin")) {
        reward = reward / 3; // 0.33x (33 CARE in Year 1)
    } else if (keccak256(bytes(activityType)) == keccak256("milestone")) {
        reward = reward * 50; // 50x (5,000 CARE in Year 1)
    }
    
    _mint(user, reward);
    emit WellnessReward(user, reward, activityType);
}
```

**Example User Journey** (Active User):

| Activity | Year 1 Reward | Year 2 Reward | Year 3 Reward |
|----------|---------------|---------------|---------------|
| Complete CBT Module | 100 CARE | 50 CARE | 25 CARE |
| Daily Check-in (30 days) | 3,000 CARE | 1,500 CARE | 750 CARE |
| Recovery Milestone | 5,000 CARE | 2,500 CARE | 1,250 CARE |
| **Monthly Total** | **8,100 CARE** | **4,050 CARE** | **2,025 CARE** |

**Inflation Control**: By Year 4, wellness rewards contribute <1% annual inflation

---

## 👥 Team Allocation (130M CARE)

### Developers (60M) - 48-Month Linear, 12-Month Cliff

**Vesting Timeline**:

| Milestone | Date | Months Elapsed | Cumulative Unlocked | % Unlocked | Claimable |
|-----------|------|----------------|---------------------|------------|-----------|
| **TGE** | Oct 2025 | 0 | 0 | 0% | 0 |
| Cliff Ends | Oct 2026 | 12 | 0 | 0% | 0 |
| Month 13 | Nov 2026 | 13 | 1.25M | 2.08% | 1.25M |
| Month 18 | Apr 2027 | 18 | 7.5M | 12.5% | 7.5M |
| Month 24 | Oct 2027 | 24 | 15M | 25% | 15M |
| Month 36 | Oct 2028 | 36 | 30M | 50% | 30M |
| **Month 48** | **Oct 2029** | **48** | **60M** | **100%** | **60M** |

**Formula**:

```
if (now < cliff_end):
    unlocked = 0
else:
    unlocked = total_allocation * (months_since_cliff / 36)
    // 36 = 48 total months - 12 cliff months
```

**Example Individual Allocation** (Senior Developer):

```
Total Allocation: 2,000,000 CARE (0.2% of total supply)

Oct 2025 - Oct 2026: 0 CARE (cliff)
Nov 2026: 41,667 CARE unlocked (first month after cliff)
Dec 2026: 83,334 CARE total unlocked
...
Oct 2029: 2,000,000 CARE fully vested
```

**Rationale**:

- **12-month cliff**: Ensures developers commit for at least 1 year
- **48-month total**: Industry standard for tech startups
- **0% TGE**: Builds trust with community (team earns, not given)

---

### Business/Marketing (40M) - Same as Developers

**Vesting**: 48 months linear, 12-month cliff, 0% TGE

**Allocation Examples**:

- CEO: 1.5% (15M CARE)
- Marketing Lead: 0.75% (7.5M CARE)
- Business Dev Lead: 0.75% (7.5M CARE)
- Team Members: Remaining 10M split

---

### Advisors (30M) - 24-Month Linear, 6-Month Cliff

**Vesting Timeline** (Shorter for Advisory Role):

| Milestone | Date | Months Elapsed | Cumulative Unlocked | % Unlocked |
|-----------|------|----------------|---------------------|------------|
| **TGE** | Oct 2025 | 0 | 0 | 0% |
| Cliff Ends | Apr 2026 | 6 | 0 | 0% |
| Month 7 | May 2026 | 7 | 1.25M | 4.17% |
| Month 12 | Oct 2026 | 12 | 7.5M | 25% |
| Month 18 | Apr 2027 | 18 | 18.75M | 62.5% |
| **Month 24** | **Oct 2027** | **24** | **30M** | **100%** |

**Formula**:

```
if (now < cliff_end):
    unlocked = 0
else:
    unlocked = total_allocation * (months_since_cliff / 18)
    // 18 = 24 total months - 6 cliff months
```

**Advisor Types**:

- Clinical Psychology Advisors: 15M (50%)
- Blockchain/Tech Advisors: 10M (33%)
- Business Strategy Advisors: 5M (17%)

**Rationale**: Advisors have shorter commitment (2 years vs 4 for team)

---

## 🤝 Partners Allocation (100M CARE)

### Merchants (60M) - 24-Month Linear, 3-Month Cliff

**Vesting Timeline**:

| Milestone | Date | Months | Base Unlocked | Bonus (if eligible) | Total Potential |
|-----------|------|--------|---------------|---------------------|-----------------|
| **TGE** | Oct 2025 | 0 | 6M (10%) | 0 | 6M |
| Cliff Ends | Jan 2026 | 3 | 6M | 0 | 6M |
| Month 6 | Apr 2026 | 6 | 12.86M | +1M (Bronze) | 13.86M |
| Month 12 | Oct 2026 | 12 | 25.71M | +3M (Silver) | 28.71M |
| Month 18 | Apr 2027 | 18 | 38.57M | +6M (Gold) | 44.57M |
| **Month 24** | **Oct 2027** | **24** | **60M** | **+12M (max)** | **72M** |

**Performance Bonuses**:

| Tier | Requirement | Bonus | Example Merchant |
|------|-------------|-------|------------------|
| Bronze | 100K CARE redeemed | 5% extra | Small faculty shop |
| Silver | 500K CARE redeemed | 10% extra | Popular food vendor |
| Gold | 1M CARE redeemed | 20% extra | UGM Official Merch |

**Partner Agreement**:

```
Initial Allocation: 2,000,000 CARE (UGM Official Merch Shop)

TGE (Oct 2025): 200,000 CARE (10%)
Month 4 (Jan 2026): +85,714 CARE (cliff ends)
Month 12 (Sep 2026): 1,000,000 CARE (50%)
Month 24 (Sep 2027): 2,000,000 CARE (100%)

If Gold tier achieved: +400,000 CARE bonus = 2,400,000 total
```

**Rationale**:

- **10% TGE**: Covers integration costs (POS, marketing, training)
- **3-month cliff**: Ensures merchant actively integrates system
- **Performance bonus**: Incentivizes high redemption volume

---

### Clinical Partners (40M) - 24-Month Linear, 6-Month Cliff

**Vesting Timeline**:

| Milestone | Date | Months | Base Unlocked | Bonus (if eligible) | Total Potential |
|-----------|------|--------|---------------|---------------------|-----------------|
| **TGE** | Oct 2025 | 0 | 4M (10%) | 0 | 4M |
| Cliff Ends | Apr 2026 | 6 | 4M | 0 | 4M |
| Month 12 | Oct 2026 | 12 | 17.33M | +1M (Basic) | 18.33M |
| Month 18 | Apr 2027 | 18 | 28M | +3M (Advanced) | 31M |
| **Month 24** | **Oct 2027** | **24** | **40M** | **+6M (Premium)** | **46M** |

**Quality Bonuses**:

| Tier | Requirement | Bonus | Example |
|------|-------------|-------|---------|
| Basic | 500+ users served | 5% extra | Small counseling center |
| Advanced | 2,000+ users, >4.5 rating | 10% extra | Faculty health center |
| Premium | 5,000+ users, >4.8 rating | 15% extra | Gadjah Mada Medical |

**Major Partner Example** (Gadjah Mada Medical Center):

```
Initial Allocation: 20,000,000 CARE (50% of clinical pool)

TGE (Oct 2025): 2,000,000 CARE (10%)
Month 7 (Apr 2026): +1,000,000 CARE (cliff ends)
Month 12 (Sep 2026): 10,000,000 CARE (50%)
Month 24 (Sep 2027): 20,000,000 CARE (100%)

If Premium tier: +3,000,000 CARE bonus = 23,000,000 total
```

**Rationale**:

- **6-month cliff**: Longer integration needed for medical systems (EMR, compliance)
- **Quality bonuses**: Incentivizes excellent patient care and satisfaction

---

## 🏛️ Treasury (100M CARE)

### Operating Reserve (50M) - On-Demand Release

**Budget Allocation** (Year 1):

| Category | Monthly Budget | Annual Total | % of Reserve |
|----------|---------------|--------------|--------------|
| Salaries | 1M CARE | 12M | 24% |
| Hosting/Infrastructure | 200K CARE | 2.4M | 4.8% |
| Marketing | 500K CARE | 6M | 12% |
| Legal/Compliance | 300K CARE | 3.6M | 7.2% |
| Contingency | 500K CARE | 6M | 12% |
| **Total Year 1** | **2.5M CARE** | **30M** | **60%** |

**Remaining**: 20M for Years 2-3 operations

**Governance**: All spending >1M CARE requires 5-of-7 multi-sig + 7-day timelock

---

### Buyback Fund (50M) - Market Conditions

**Buyback Strategy**:

| Trigger | Action | Max Amount | Frequency |
|---------|--------|------------|-----------|
| Price -30% in 24h | Emergency | 5M CARE | Immediate |
| Price -20% in 7d | Strategic | 3M CARE | As needed |
| Quarterly (stable) | Scheduled | 1M CARE | Every 90 days |
| Community vote | Ad-hoc | Variable | On approval |

**Example Execution**:

```
Scenario: Token price drops from $0.10 to $0.07 (-30%) in 24 hours

Action: Emergency buyback triggered
Budget: 5M CARE approved by multi-sig
Execution: Market buy 5M CARE at $0.07 = $350K USD spent
Result: 5M CARE permanently burned
Effect: Supply reduced by 0.5%, buying pressure stabilizes price
```

**Sustainability**: 50M CARE fund supports 10-20 buyback events over 3-5 years

---

## 💧 Liquidity (80M CARE)

### Primary Pool (50M) - Locked 24 Months

**Lock Mechanism**:

```solidity
contract LiquidityLock {
    uint256 public lockEndTime = block.timestamp + 730 days; // 24 months
    address public lpTokenAddress;
    uint256 public lockedLPAmount;
    
    function unlockLiquidity() external {
        require(block.timestamp >= lockEndTime, "Still locked");
        require(msg.sender == owner, "Not authorized");
        
        // Linear unlock over 6 months after lock period
        uint256 unlockableAmount = calculateUnlock();
        IERC20(lpTokenAddress).transfer(owner, unlockableAmount);
    }
}
```

**Unlock Timeline**:

| Date | Locked | Unlockable | % Unlocked |
|------|--------|------------|------------|
| Oct 2025 - Oct 2027 | 50M | 0 | 0% |
| Oct 2027 (lock ends) | 50M | 0 | 0% |
| Nov 2027 | 41.67M | 8.33M | 16.7% |
| Jan 2028 | 25M | 25M | 50% |
| Apr 2028 (full unlock) | 0 | 50M | 100% |

**Rationale**: 24-month lock prevents rug pull, gradual unlock prevents market shock

---

### Secondary Pools (30M) - Deployed Month 2-3

**Deployment Schedule**:

| Pool | Amount | Deploy Date | Lock Period | Purpose |
|------|--------|-------------|-------------|---------|
| CARE/USDC | 15M | Dec 2025 | 12 months | Stablecoin pair |
| CARE/ETH | 10M | Jan 2026 | 12 months | Bridge liquidity |
| Future Pairs | 5M | Q2 2026 | 12 months | Community vote |

**Rationale**: Diversified liquidity across multiple pairs reduces single-point dependency

---

## 🎁 Grants (40M CARE)

### Research Grants (20M) - Quarterly Awards

**Distribution Timeline**:

| Year | Quarterly Budget | Est. Grants | Cumulative |
|------|-----------------|-------------|------------|
| 1 | 1.25M | 3-5 | 5M |
| 2 | 1.25M | 2-4 | 10M |
| 3 | 1.25M | 2-3 | 15M |
| 4 | 1.25M | 1-2 | 20M |

**Major Grant Example**:

```
UGM Psychology Department Study (Year 1)

Grant Amount: 1,000,000 CARE
Milestones:
├─ 30% upfront (300K): IRB approval + study design
├─ 30% mid-point (300K): Data collection complete
└─ 40% completion (400K): Peer-reviewed publication

Timeline: 18 months
Expected Impact: Scientific validation of platform efficacy
```

---

### Developer Grants (20M) - Rolling Basis

**Distribution Timeline**:

| Year | Annual Budget | Est. Grants | Avg. Grant Size |
|------|--------------|-------------|-----------------|
| 1 | 5M | 15-20 | 250K-333K |
| 2 | 5M | 10-15 | 333K-500K |
| 3 | 5M | 8-12 | 417K-625K |
| 4 | 5M | 5-10 | 500K-1M |

**Example Grant Categories**:

- Open source tools: 100K-300K CARE
- Integration bounties: 50K-100K CARE
- Hackathon prizes: 10K-50K per team
- Major features: 500K-1M CARE

---

## 📊 Cumulative Unlock Summary

### Year-by-Year Breakdown

| Year | Community | Wellness | Team | Partners | Treasury | Liquidity | Grants | **Total** | **Cum.** |
|------|-----------|----------|------|----------|----------|-----------|--------|-----------|----------|
| **1** | 60M | 37.5M | 15M | 28M | 45M | 50M | 7.5M | **243M** | **243M** |
| **2** | 70M | 25M | 33M | 36M | 15M | 5M | 10M | **194M** | **437M** |
| **3** | 60M | 12.5M | 33M | 36M | 15M | 10M | 10M | **176.5M** | **613.5M** |
| **4** | 50M | 6.25M | 33M | 0 | 10M | 10M | 10M | **119.25M** | **732.75M** |
| **5** | 40M | 6.25M | 16M | 0 | 7.5M | 5M | 7.5M | **82.25M** | **815M** |
| **6-10** | 70M | 125M | 0 | 0 | 7.5M | 0 | 5M | **207.5M** | **~1B** |

**Key Insights**:

- Year 1-2: Highest unlock (24% + 19% = 43% total)
- Year 3-4: Declining unlock as vesting completes
- Year 5+: Minimal unlock (<10%/year)
- By Year 5: 81.5% of supply circulating
- Years 6-10: Remaining 18.5% primarily from wellness (halving)

---

## 🔒 Anti-Dump Mechanisms Summary

### Total Locked at Launch (TGE)

| Category | Amount | Lock Type | Duration | Release |
|----------|--------|-----------|----------|---------|
| Team | 130M | Vesting | 48 months | Oct 2029 |
| Partners (90%) | 90M | Vesting | 24 months | Oct 2027 |
| Liquidity | 50M | Smart contract | 24 months | Apr 2028 |
| Treasury (70%) | 70M | Multi-sig | On-demand | Controlled |
| **Total Protected** | **340M** | - | - | **34% locked** |

**Additional Protection**:

- Staking locks: Est. 40-50% of circulating supply by Year 2
- Effective locked: ~70-75% of supply not freely tradeable

**Result**: Low sell pressure, healthy price discovery, community trust

---

## ✅ Vesting Contract Specifications

### Smart Contract Requirements

```solidity
// Core vesting features required

contract CareVesting {
    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 released;
        bool revocable;
    }
    
    mapping(address => VestingSchedule[]) public schedules;
    
    // Create new vesting schedule
    function createVesting(
        address beneficiary,
        uint256 amount,
        uint256 cliff,
        uint256 duration,
        bool revocable
    ) external onlyOwner;
    
    // Release vested tokens
    function release(address beneficiary, uint256 scheduleId) external;
    
    // Calculate vested amount
    function vestedAmount(address beneficiary, uint256 scheduleId) 
        public view returns (uint256);
    
    // Revoke unvested tokens (if revocable)
    function revoke(address beneficiary, uint256 scheduleId) 
        external onlyOwner;
}
```

**Deployment Plan**:

1. CareToken.sol (main token)
2. CareTeamVesting.sol (team + advisors)
3. CarePartnerVesting.sol (merchants + clinical)
4. CareStaking.sol (staking rewards)
5. CareTreasury.sol (multi-sig treasury)

---

**Document Complete** ✅

All vesting schedules, formulas, and timelines documented for website and whitepaper publication.

*Last Updated: October 27, 2025*
