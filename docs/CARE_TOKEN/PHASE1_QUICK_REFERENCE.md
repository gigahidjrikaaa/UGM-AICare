# Phase 1 Quick Reference Guide

## 🚀 Deployment Commands

### Testnet Deployment

```bash
cd blockchain
npx hardhat run scripts/deployPhase1.ts --network somniaTestnet
```

### Run Tests

```bash
npx hardhat test test/Phase1Security.test.ts
```

### Compile Contracts

```bash
npx hardhat compile
```

---

## 📝 Contract Addresses (Update After Deployment)

### SOMNIA Testnet (Chain ID: 50312)

```
CareToken: TBD
CareTokenController: TBD
CareTeamVesting: TBD
CarePartnerVesting: TBD
CareLiquidityLock: TBD
```

### SOMNIA Mainnet (Chain ID: 5031)

```
CareToken: TBD
CareTokenController: TBD
CareTeamVesting: TBD
CarePartnerVesting: TBD
CareLiquidityLock: TBD
```

---

## 🔑 Role Management

### CareToken Roles

- `DEFAULT_ADMIN_ROLE`: Deployer → Transfer to multi-sig
- `MINTER_ROLE`: CareTokenController contract
- `PAUSER_ROLE`: Emergency responders

### CareTokenController Roles

- `DEFAULT_ADMIN_ROLE`: Deployer → Transfer to multi-sig
- `COMMUNITY_MINTER_ROLE`: Backend reward system
- `WELLNESS_MINTER_ROLE`: Backend reward system
- `TEAM_MANAGER_ROLE`: Team vesting contract
- `PARTNER_MANAGER_ROLE`: Partner vesting contract
- `TREASURY_ROLE`: Treasury multi-sig
- `LIQUIDITY_MANAGER_ROLE`: Liquidity pool manager
- `GRANTS_MANAGER_ROLE`: Grants committee

---

## 📊 Allocation Summary

| Category | Amount | Contract | Duration |
|----------|--------|----------|----------|
| Team | 130M CARE | CareTeamVesting | 4 years (12-mo cliff) |
| Partners | 100M CARE | CarePartnerVesting | 2 years (3-6 mo cliff) |
| Liquidity | 80M CARE | CareLiquidityLock | 24-mo lock, 6-mo unlock |
| **Phase 1 Total** | **310M CARE** | **Locked/Vested** | **2-4 years** |

---

## ⏰ Vesting Timeline (Example: TGE = Jan 1, 2026)

### Team (4-year vesting, 12-month cliff)

- **Jan 1, 2026**: Vesting starts (0% claimable)
- **Jan 1, 2027**: Cliff ends (25% claimable = 32.5M CARE)
- **Jan 1, 2028**: 50% claimable (65M CARE)
- **Jan 1, 2029**: 75% claimable (97.5M CARE)
- **Jan 1, 2030**: 100% claimable (130M CARE)

### Partners (2-year vesting, 3-6 month cliff)

- **Jan 1, 2026**: Vesting starts (0% claimable)
- **Apr 1-Jul 1, 2026**: Cliff ends (varies by tier)
- **Jan 1, 2027**: 50% claimable (50M CARE)
- **Jan 1, 2028**: 100% claimable (100M CARE + bonuses)

### Liquidity (24-month lock, 6-month unlock)

- **Jan 1, 2026**: Lock starts (0% withdrawable)
- **Jan 1, 2028**: Lock ends, unlock starts (0% withdrawable)
- **Apr 1, 2028**: 50% withdrawable (40M CARE)
- **Jul 1, 2028**: 100% withdrawable (80M CARE)

---

## 🛡️ Security Checklist

### Before Testnet Deployment

- [ ] All contracts compile successfully
- [ ] Test suite passes (100% rate)
- [ ] Environment variables configured (.env)
- [ ] STT tokens in deployer wallet

### After Testnet Deployment

- [ ] Verify contracts on block explorer
- [ ] Test all vesting scenarios
- [ ] Test emergency procedures
- [ ] Test role management

### Before Mainnet Deployment

- [ ] Security audit completed
- [ ] Audit findings addressed
- [ ] Multi-sig wallet deployed
- [ ] Deployment parameters finalized
- [ ] Team coordination call scheduled

### After Mainnet Deployment

- [ ] Transfer ownership to multi-sig
- [ ] Fund vesting contracts (310M CARE)
- [ ] Add beneficiaries/partners
- [ ] Publish contract addresses
- [ ] Set up monitoring alerts
- [ ] Update frontend with ABIs
- [ ] Update backend with addresses

---

## 🔧 Common Operations

### Add Team Member to Vesting

```typescript
// As contract owner
await teamVesting.addBeneficiary(
  "0xTeamMemberAddress",
  ethers.parseEther("1000000"), // 1M CARE
  0 // DEVELOPER (0), BUSINESS (1), or ADVISOR (2)
);
```

### Add Partner to Vesting

```typescript
// As contract owner
await partnerVesting.addPartner(
  "0xPartnerAddress",
  ethers.parseEther("500000"), // 500k CARE base
  0 // PREMIUM (0), STANDARD (1), or BASIC (2)
);

// Award performance bonus
await partnerVesting.awardPerformanceBonus(
  "0xPartnerAddress",
  2 // GOLD (2), SILVER (1), or BRONZE (0)
);
```

### Create Liquidity Pool Lock

```typescript
// As contract owner
const lockStartTime = Math.floor(Date.now() / 1000);
await liquidityLock.createPool(
  "Uniswap CARE/SOMI",
  0, // PRIMARY_DEX (0), SECONDARY_DEX (1), CEX_LISTING (2), BRIDGE (3)
  ethers.parseEther("50000000"), // 50M CARE
  lockStartTime
);
```

### Mint via Controller

```typescript
// As role holder (e.g., WELLNESS_MINTER_ROLE)
await controller.mintForCategory(
  4, // WELLNESS_THERAPY category
  "0xRecipientAddress",
  ethers.parseEther("100"), // 100 CARE
  "Completed CBT module"
);
```

---

## 🚨 Emergency Procedures

### Pause Token Transfers

```typescript
// As PAUSER_ROLE holder
await careToken.pause("Security incident detected");
```

### Revoke Team Member Vesting

```typescript
// As contract owner (use multi-sig)
await teamVesting.revokeVesting("0xTeamMemberAddress");
// Unvested tokens returned to owner
```

### Emergency Unlock Liquidity

```typescript
// Requires owner + authorized signer
// 1. Get signature from authorized signer
const messageHash = ethers.solidityPackedKeccak256(
  ["bytes32", "uint256", "address"],
  [poolId, chainId, contractAddress]
);
const signature = await authorizerSigner.signMessage(ethers.getBytes(messageHash));

// 2. Execute emergency unlock
await liquidityLock.emergencyUnlock(poolId, signature);
```

---

## 📈 Monitoring Queries

### Check Vesting Status

```typescript
// Get beneficiary details
const beneficiary = await teamVesting.getBeneficiary("0xAddress");
console.log("Total allocation:", ethers.formatEther(beneficiary.totalAllocation));
console.log("Vested now:", ethers.formatEther(beneficiary.vestedNow));
console.log("Claimable now:", ethers.formatEther(beneficiary.claimableNow));
console.log("Claimed:", ethers.formatEther(beneficiary.claimedAmount));
```

### Check Category Stats

```typescript
// Get community stats
const stats = await controller.getCommunityStats();
console.log("Airdrop minted:", ethers.formatEther(stats.airdropMinted));
console.log("Staking minted:", ethers.formatEther(stats.stakingMinted));
console.log("Total minted:", ethers.formatEther(stats.totalMinted));
console.log("Total cap:", ethers.formatEther(stats.totalCap));
```

### Check Burn Stats

```typescript
// Get burn statistics
const burns = await controller.getBurnStats();
console.log("Redemption burns:", ethers.formatEther(burns.redemption));
console.log("Buyback burns:", ethers.formatEther(burns.buyback));
console.log("Total burned:", ethers.formatEther(burns.total));
```

---

## 🔗 Useful Links

### SOMNIA Blockchain

- **Mainnet Explorer**: <https://explorer.somnia.network>
- **Testnet Explorer**: <https://shannon-explorer.somnia.network>
- **Documentation**: <https://docs.somnia.network>
- **Faucet**: <https://stakely.io/faucet/somnia-testnet-stt>

### OpenZeppelin

- **Contracts Docs**: <https://docs.openzeppelin.com/contracts/>
- **Defender**: <https://defender.openzeppelin.com/>

### Multi-Sig Wallets

- **Gnosis Safe**: <https://safe.global/>
- **Safe App**: <https://app.safe.global/>

### Audit Firms

- **CertiK**: <https://www.certik.com/>
- **Hacken**: <https://hacken.io/>
- **OpenZeppelin**: <https://openzeppelin.com/security-audits/>
- **Quantstamp**: <https://quantstamp.com/>

---

## 📞 Support Contacts

### Internal Team

- **Smart Contract Lead**: [Name] - [Email]
- **Backend Integration**: [Name] - [Email]
- **Frontend Integration**: [Name] - [Email]
- **Security Auditor**: [Firm] - [Contact]

### Emergency Contacts

- **Multi-Sig Signers**: [List of 5 signers]
- **Emergency Authorizer**: [Address for liquidity unlock]
- **On-Call Developer**: [Phone/Telegram]

---

## 📚 Documentation Index

1. **TOKENOMICS_FINAL.md** - Complete tokenomics specification
2. **VESTING_SCHEDULES.md** - Detailed vesting formulas
3. **DISTRIBUTION_SUMMARY.md** - Quick visual reference
4. **PHASE1_SECURITY_REVIEW.md** - Security assessment (16 pages)
5. **PHASE1_IMPLEMENTATION_SUMMARY.md** - Implementation overview
6. **PHASE1_QUICK_REFERENCE.md** - This document

---

**Last Updated:** October 27, 2025  
**Version:** Phase 1.0  
**Status:** Ready for Testing
