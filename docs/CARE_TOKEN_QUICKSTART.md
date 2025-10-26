# Quick Start: Deploy $CARE Token on SOMNIA

This is a rapid deployment guide. For complete documentation, see `CARE_TOKEN_IMPLEMENTATION.md`.

## 🚀 5-Minute Testnet Deployment

### 1. Install & Setup (2 min)

```bash
# Navigate to blockchain directory
cd blockchain

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Get Testnet Tokens (2 min)

1. Add SOMNIA Testnet to MetaMask:
   - Network: SOMNIA Testnet
   - RPC: `https://dream-rpc.somnia.network/`
   - Chain ID: `50312`
   - Symbol: `STT`

2. Get free testnet tokens:
   - Visit: <https://stakely.io/faucet/somnia-testnet-stt>
   - Enter your wallet address
   - Claim tokens

### 3. Configure Environment (1 min)

Edit `blockchain/.env`:

```env
SOMNIA_TESTNET_RPC_URL=https://dream-rpc.somnia.network/
TESTNET_PRIVATE_KEY=your_private_key_here_without_0x
```

**⚠️ Get private key from MetaMask:**

- Click account → Account Details → Export Private Key
- Copy WITHOUT the `0x` prefix

### 4. Deploy Token (< 1 min)

```bash
# Compile contract
npx hardhat compile

# Deploy to SOMNIA Testnet
npx hardhat run scripts/deployCareToken.ts --network somniaTestnet
```

### 5. Save Contract Address

Copy the deployed address from output:

```
📍 Contract Address: 0xABCDEF...
```

---

## ✅ Verify Deployment

Visit SOMNIA Testnet Explorer:

```
https://shannon-explorer.somnia.network/address/YOUR_CONTRACT_ADDRESS
```

You should see:

- ✅ Contract deployed
- ✅ 100,000,000 CARE tokens minted
- ✅ Transaction history

---

## 🔧 Next Steps

### Connect Backend

1. **Update `backend/.env`:**

```env
CARE_TOKEN_ADDRESS=0xYourContractAddress
SOMNIA_RPC_URL=https://dream-rpc.somnia.network/
```

2. **Install dependencies:**

```bash
cd backend
pip install web3 eth-account
```

3. **Test connection:**

```bash
python -c "from app.services.care_token_service import get_care_token_service; service = get_care_token_service(); print('✅ Connected')"
```

### Grant Minter Role

The backend needs permission to mint rewards:

```bash
npx hardhat console --network somniaTestnet
```

In console:

```javascript
const token = await ethers.getContractAt("CareToken", "YOUR_CONTRACT_ADDRESS")
const MINTER_ROLE = await token.MINTER_ROLE()

// Grant to your backend wallet
await token.grantRole(MINTER_ROLE, "BACKEND_WALLET_ADDRESS")

// Verify
console.log(await token.hasRole(MINTER_ROLE, "BACKEND_WALLET_ADDRESS"))
```

### Test Minting

```javascript
// Mint 100 CARE to a test wallet
await token.mintTokens(
  "0xTestWalletAddress",
  100,
  "Test reward"
)

// Check balance
const balance = await token.balanceOf("0xTestWalletAddress")
console.log(ethers.formatEther(balance), "CARE")
```

---

## 🎉 Success

Your $CARE token is now live on SOMNIA Testnet!

**What you can do:**

- ✅ Mint tokens to reward users
- ✅ Transfer tokens between wallets
- ✅ Check balances via API
- ✅ Burn tokens to reduce supply
- ✅ View all transactions on explorer

**What's next:**

1. Integrate with reward system
2. Add voucher redemption
3. Create merchant partnerships
4. Test thoroughly
5. Deploy to mainnet when ready

---

## 📚 Full Documentation

- **Complete Guide**: `docs/CARE_TOKEN_IMPLEMENTATION.md`
- **Token Details**: `blockchain/CARE_TOKEN_README.md`
- **SOMNIA Docs**: <https://docs.somnia.network/>

---

## 🆘 Need Help?

**Common Issues:**

❌ **"Insufficient funds for gas"**
→ Get more STT from faucet

❌ **"Cannot connect to network"**
→ Check RPC URL in .env

❌ **"Private key error"**
→ Remove `0x` prefix from key

❌ **"Contract not verified"**
→ Normal for testnet, check explorer anyway

---

*Built on SOMNIA - The 1M+ TPS blockchain for mass-consumer applications*
