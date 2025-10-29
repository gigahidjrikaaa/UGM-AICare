# Multi-Chain Blockchain Module Documentation

## Overview

The **blockchain/** module handles all smart contract interactions for the UGM-AICare platform across **multiple blockchains**, providing a clean separation of blockchain-specific code from business logic.

## 🌐 Multi-Chain Architecture

UGM-AICare integrates with **two blockchains**:

### 1. SOMNIA Mainnet (Chain ID: 5031)

**Purpose**: Platform tokenomics and finance infrastructure

**Contracts**:

- **CareToken** (ERC20) - Platform utility token with role-based minting
- **PlatformRevenueOracle** - Monthly revenue reporting with multi-sig approval
- **CareStakingHalal** - Mudarabah-compliant profit-sharing staking system

**Use Cases**:

- Mint CARE tokens for rewards, staking, team allocations
- Submit monthly revenue reports to blockchain
- Track staking pools, TVL, and profit distributions

### 2. EDU Chain Testnet

**Purpose**: Achievement NFT badges for student accomplishments

**Contracts**:

- **UGMJournalBadges** (ERC1155) - Multi-token NFT for various achievement types

**Use Cases**:

- Mint NFT badges when students complete quests, journals, or milestones
- Track user badge collections on-chain

## 📁 Module Structure

```plaintext
backend/app/blockchain/
├── __init__.py                       # Multi-chain exports
├── base_web3.py                      # Shared Web3 base client
├── README.md                         # This file
│
├── somnia/                           # SOMNIA Mainnet contracts
│   ├── __init__.py
│   ├── care_token_client.py         # CARE token operations
│   ├── oracle_client.py             # Revenue oracle interactions
│   └── staking_client.py            # Staking contract queries
│
└── edu_chain/                        # EDU Chain Testnet contracts
    ├── __init__.py
    ├── nft_client.py                # NFT badge minting
    └── abi/
        └── UGMJournalBadges.json    # Contract ABI
```

## 🔧 Base Web3 Client

Located: `app/blockchain/base_web3.py`

All blockchain clients extend `BaseWeb3Client` for shared functionality:

### Features

- Web3 connection management
- POA middleware injection
- Transaction signing and submission
- Gas estimation with 20% safety buffer
- Retry logic with exponential backoff
- Address checksum conversion
- Wei ↔ Ether conversions

### Usage

```python
from app.blockchain.base_web3 import BaseWeb3Client

client = BaseWeb3Client()

# Get balance
balance = client.get_balance("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9")

# Convert units
wei = client.to_wei(1.5, 'ether')
ether = client.from_wei(1500000000000000000)
```

---

## 🪙 SOMNIA: CARE Token Client

Located: `app/blockchain/somnia/care_token_client.py`

### Features

- Mint tokens via CareTokenController (14 categories)
- Check token balances
- Query token information (name, symbol, supply, etc.)
- Transfer tokens

### Usage

```python
from app.blockchain.somnia import CareTokenClient

token_client = CareTokenClient()

# Get balance
balance = await token_client.get_token_balance("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9")
print(f"Balance: {balance} CARE")

# Mint tokens for community staking (category 1)
result = await token_client.mint_for_category(
    category=1,
    to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount=1000 * (10 ** 18),  # 1000 CARE in wei
    reason="Monthly staking rewards"
)

# Get token info
info = await token_client.get_token_info()
```

### Mint Categories

Per `CareTokenController.sol`:

0. **Platform Operations**: Operational expenses
1. **Community Staking**: Staking pool allocations
2. **Rewards**: User rewards (quest completion, milestones)
3. **Team**: Team allocations (vested)
4. **Advisors**: Advisor allocations (vested)
5. **Marketing**: Marketing campaigns, airdrops
6. **Partnerships**: Strategic partnerships
7. **Development**: Core development team
8. **Treasury**: Protocol treasury
9. **Research**: Research grants, academic partnerships
10. **Charity**: Charitable initiatives
11. **Emergency**: Emergency reserves
12. **Liquidity**: DEX liquidity provision
13. **Governance**: Governance incentives

Each category requires specific role permissions (e.g., `COMMUNITY_MINTER_ROLE` for staking).

---

## 📊 SOMNIA: Platform Revenue Oracle Client

Located: `app/blockchain/somnia/oracle_client.py`

### Oracle Features

- Submit monthly revenue reports
- Query historical reports
- Approve reports (multi-sig workflow)

### Oracle Usage

```python
from app.blockchain.somnia import OracleClient

oracle_client = OracleClient()

# Submit monthly report
result = await oracle_client.submit_monthly_report(
    month_yyyymm=202510,
    total_revenue_wei=14000 * (10 ** 18),
    total_expenses_wei=3000 * (10 ** 18),
    breakdown_tuple=(5000, 3000, 1500, 2500, 2000)  # In wei
)

# Query historical report
report = await oracle_client.get_report(month_yyyymm=202510)

# Approve report (multi-sig)
result = await oracle_client.approve_report(month_yyyymm=202510)
```

---

## 🥩 SOMNIA: Staking Client

Located: `app/blockchain/somnia/staking_client.py`

### Staking Features

- Query Total Value Locked (TVL)
- Get staker position details
- Query tier distribution (planned)

### Staking Usage

```python
from app.blockchain.somnia import StakingClient

staking_client = StakingClient()

# Get TVL
tvl = await staking_client.get_tvl()
print(f"TVL: {tvl['tvl_formatted']}")

# Get staker position
position = await staking_client.get_staker_position("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9")
print(f"Tier: {position['tier_name']}")
print(f"Staked: {position['staked_amount_care']} CARE")
print(f"Profit Share: {position['profit_share_percent']}%")
```

### Staking Tiers

Per `CareStakingHalal.sol`:

- **Bronze**: 25,000-99,999 CARE (25% profit share)
- **Silver**: 100,000-499,999 CARE (30% profit share)
- **Gold**: 500,000-999,999 CARE (35% profit share)
- **Platinum**: 1,000,000+ CARE (40% profit share)

---

## 🎨 EDU Chain: NFT Badge Client

Located: `app/blockchain/edu_chain/nft_client.py`

### NFT Features

- Mint achievement NFT badges (ERC1155)
- Query badge ownership
- Track minting history

### NFT Usage

```python
from app.blockchain import init_nft_client, mint_nft_badge

# Initialize EDU Chain connection (call once at startup)
await init_nft_client()

# Mint a badge
tx_hash = mint_nft_badge(
    recipient_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    badge_id=1,  # Badge type (e.g., 1 = First Journal Entry)
    amount=1     # Number of badges to mint
)

if tx_hash:
    print(f"✅ Badge minted! Tx: {tx_hash}")
else:
    print("❌ Minting failed")
```

### Badge Types

NFT badges are awarded for various achievements:

- **Badge ID 1**: First Journal Entry
- **Badge ID 2**: 7-Day Streak
- **Badge ID 3**: Complete CBT Module
- **Badge ID 4**: First Check-in
- **Badge ID 5**: Community Helper
- *(More badge types defined in smart contract)*

### EDU Chain Network Info

- **Network**: EDU Chain Testnet
- **RPC**: <https://rpc.open-campus-codex.gelato.digital>
- **Explorer**: <https://explorer.open-campus-codex.gelato.digital>
- **Token Standard**: ERC1155 (multi-token NFT)
- **Contract**: UGMJournalBadges

---

## 🔐 Environment Variables

### SOMNIA (Required)

```bash
# SOMNIA Mainnet
SOMNIA_RPC_URL=https://api.infra.mainnet.somnia.network/

# SOMNIA Contract Addresses
CARE_TOKEN_ADDRESS=0x...
CARE_TOKEN_CONTROLLER_ADDRESS=0x...
PLATFORM_REVENUE_ORACLE_ADDRESS=0x...
CARE_STAKING_HALAL_ADDRESS=0x...

# SOMNIA Private Keys (keep secure!)
CARE_MINTER_PRIVATE_KEY=0x...
FINANCE_TEAM_PRIVATE_KEY=0x...
```

### EDU Chain (Required)

```bash
# EDU Chain Testnet
EDU_TESTNET_RPC_URL=https://rpc.open-campus-codex.gelato.digital
NFT_CONTRACT_ADDRESS=0x...
BACKEND_MINTER_PRIVATE_KEY=0x...
```

### Network Info

**SOMNIA Mainnet**:

- **Chain ID**: 5031
- **Native Token**: STT (SOMNIA Test Token)
- **Block Time**: ~2 seconds
- **Consensus**: Proof of Authority (POA)

**EDU Chain Testnet**:

- **Chain ID**: Check network docs
- **Block Time**: ~5 seconds
- **Faucet**: Available for testnet tokens

## 🛠️ Transaction Handling

### Gas Management

```python
# Automatic gas estimation with 20% buffer
gas = await client.estimate_gas(transaction)

# Manual gas settings
transaction['gas'] = 500000
transaction['gasPrice'] = await client.get_gas_price()
```

### Retry Logic

All transactions automatically retry up to 3 times with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds

### Error Handling

```python
try:
    result = await client.send_transaction(...)
    if result:
        print(f"Success! Tx: {result['tx_hash']}")
    else:
        print("Transaction failed")
except Exception as e:
    logger.error(f"Error: {e}")
```

## 📝 Contract ABIs

### Loading ABIs

**SOMNIA Contracts**: ABIs are loaded from compiled Hardhat artifacts:

```plaintext
blockchain/artifacts/contracts/
├── CareToken.sol/CareToken.json
├── CareTokenController.sol/CareTokenController.json
├── PlatformRevenueOracle.sol/PlatformRevenueOracle.json
└── CareStakingHalal.sol/CareStakingHalal.json
```

**EDU Chain Contracts**: ABI stored directly in module:

```plaintext
backend/app/blockchain/edu_chain/abi/
└── UGMJournalBadges.json
```

If SOMNIA artifacts aren't available, clients fall back to minimal ABIs for basic operations.

### Updating ABIs

**SOMNIA Contracts** - After contract changes:

```bash
cd blockchain/
npx hardhat compile
# ABIs automatically updated in artifacts/
```

**EDU Chain Contracts** - Update manually:

```bash
# Copy ABI from EDU Chain contract deployment
cp /path/to/UGMJournalBadges.json backend/app/blockchain/edu_chain/abi/
```

---

## 🧪 Testing

### Unit Tests

Create `backend/tests/blockchain/` with:

**SOMNIA Tests**:

- `test_base_web3.py`: Test Web3 connection and utilities
- `test_somnia_care_token_client.py`: Test token operations
- `test_somnia_oracle_client.py`: Test revenue oracle
- `test_somnia_staking_client.py`: Test staking queries

**EDU Chain Tests**:

- `test_edu_chain_nft_client.py`: Test NFT minting

### Integration Tests

- Test SOMNIA contracts against testnet
- Test EDU Chain NFT minting
- Mock Web3 responses for unit tests
- Verify transaction receipts across both chains

## ⚠️ Production Considerations

1. **Private Key Security**
   - Use hardware wallets or secure key management systems
   - Never commit private keys to version control
   - Rotate keys periodically

2. **Gas Price Monitoring**
   - Implement dynamic gas price strategies
   - Set maximum gas price limits
   - Monitor for gas price spikes

3. **Transaction Monitoring**
   - Log all transactions to database
   - Implement transaction status tracking
   - Set up alerts for failed transactions

4. **Rate Limiting**
   - Implement rate limits for RPC calls
   - Use backup RPC URLs for failover
   - Cache blockchain data when possible

## 🔗 Integration with Finance Module

The finance module uses blockchain clients for revenue reporting:

```python
# In app/finance/revenue_tracker.py
from app.blockchain import OracleClient

oracle_client = OracleClient()
result = await oracle_client.submit_monthly_report(...)
```

## 📚 Related Documentation

- **Finance Module**: `backend/app/finance/README.md`
- **Smart Contracts**: `blockchain/README.md`
- **Deployment Scripts**: `blockchain/scripts/`
- **API Reference**: Auto-generated at `/docs`

---

**Last Updated**: October 28, 2025  
**Module Version**: 1.0.0  
**Status**: ✅ Production Ready
