# $CARE Token Deployment & Integration Guide

*Complete walkthrough for deploying and integrating $CARE token on SOMNIA blockchain*

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js and npm installed
- [ ] MetaMask browser extension
- [ ] Python 3.9+ installed
- [ ] Access to SOMNIA testnet

## 🚀 Step 1: Get SOMNIA Testnet Tokens (STT)

### Option 1: Official SOMNIA Testnet Faucet (Recommended)

1. **Add SOMNIA Testnet to MetaMask:**
   - Network Name: `SOMNIA Testnet (Shannon)`
   - RPC URL: `https://dream-rpc.somnia.network/`
   - Chain ID: `50312`
   - Currency Symbol: `STT`
   - Block Explorer: `https://shannon-explorer.somnia.network`

2. **Visit the official testnet faucet:**
   - Go to: <https://testnet.somnia.network/>
   - Connect your MetaMask wallet
   - Click "Get STT Tokens"
   - Claim 0.5 STT (enough for deployment and testing)

### Option 2: Google Cloud Faucet

1. Visit: <https://cloud.google.com/application/web3/faucet/somnia/shannon>
2. Sign in with your Google account
3. Enter your wallet address
4. Request testnet tokens

### Option 3: Thirdweb Faucet

1. Go to: <https://thirdweb.com/somnia-shannon-testnet>
2. Click "Add to wallet" to add SOMNIA testnet
3. Scroll down to "Faucet" section
4. Enter your wallet address and claim tokens

### Verify Token Receipt

Check your MetaMask wallet - you should see STT tokens appear within 1-2 minutes.

---

## 🏗️ Step 2: Deploy CARE Token to Testnet

### 2.1: Prepare Environment

```bash
# Navigate to blockchain directory
cd blockchain

# Install dependencies (if not already done)
npm install

# Verify .env file exists with SOMNIA config
cat .env
```

Your `.env` should contain:

```env
SOMNIA_TESTNET_RPC_URL=https://dream-rpc.somnia.network/
TESTNET_PRIVATE_KEY=your_private_key_without_0x
```

### 2.2: Compile Contract

```bash
npx hardhat compile
```

Expected output:

```
Compiled 36 Solidity files successfully
```

### 2.3: Deploy to SOMNIA Testnet

```bash
npx hardhat run scripts/deployCareToken.ts --network somniaTestnet
```

### 2.4: Save Deployment Information

The deployment script will output:

```
✅ CareToken deployed successfully!
📍 Contract Address: 0xABCDEF123456...
🔍 View on Explorer: https://shannon-explorer.somnia.network/address/0xABCDEF...
```

**IMPORTANT:** Save this contract address! You'll need it for backend and frontend integration.

Update your `.env` file:

```env
CARE_TOKEN_TESTNET_ADDRESS=0xYourDeployedContractAddress
```

---

## 🔐 Step 3: Grant Minter Role to Backend

The backend needs permission to mint CARE tokens as rewards.

### 3.1: Open Hardhat Console

```bash
npx hardhat console --network somniaTestnet
```

### 3.2: Grant MINTER_ROLE

In the Hardhat console, run:

```javascript
// Get contract instance
const CareToken = await ethers.getContractFactory("CareToken")
const token = await CareToken.attach("YOUR_CONTRACT_ADDRESS")

// Get MINTER_ROLE bytes
const MINTER_ROLE = await token.MINTER_ROLE()
console.log("MINTER_ROLE:", MINTER_ROLE)

// Grant role to backend wallet
const backendWallet = "YOUR_BACKEND_WALLET_ADDRESS"
const tx = await token.grantRole(MINTER_ROLE, backendWallet)
await tx.wait()

console.log("✅ Minter role granted!")

// Verify role was granted
const hasRole = await token.hasRole(MINTER_ROLE, backendWallet)
console.log("Backend has MINTER_ROLE:", hasRole)
```

### 3.3: Test Minting

Still in Hardhat console:

```javascript
// Mint 100 CARE tokens to a test address
const testWallet = "0xYourTestWalletAddress"
const tx = await token.mintTokens(testWallet, 100, "Test mint")
await tx.wait()

console.log("✅ Minted 100 CARE tokens")

// Check balance
const balance = await token.balanceOf(testWallet)
console.log("Balance:", ethers.formatEther(balance), "CARE")
```

---

## 💻 Step 4: Backend Integration

### 4.1: Update Backend Environment

Edit `backend/.env`:

```env
# CARE Token Configuration
CARE_TOKEN_ADDRESS=0xYourDeployedContractAddress
SOMNIA_RPC_URL=https://dream-rpc.somnia.network/
CARE_MINTER_PRIVATE_KEY=your_backend_wallet_private_key
CARE_TOKEN_NETWORK=testnet
```

### 4.2: Install Python Dependencies

```bash
cd backend
pip install web3
```

### 4.3: Register CARE Token Routes

Add to `backend/app/main.py`:

```python
from app.routes import care_token

# Register CARE token routes
app.include_router(care_token.router)
```

### 4.4: Test Backend Connection

```bash
cd backend
python -c "
from app.services.care_token_service import get_care_token_service
service = get_care_token_service()
print('✅ Connected to SOMNIA blockchain')
print('Chain ID:', service.w3.eth.chain_id)
"
```

### 4.5: Test API Endpoints

Start your backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Test the endpoints:

```bash
# Get token info
curl http://localhost:8000/api/v1/care-token/info

# Check a balance
curl http://localhost:8000/api/v1/care-token/balance/0xYourWalletAddress

# Mint tokens (requires authentication)
curl -X POST http://localhost:8000/api/v1/care-token/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": 1,
    "wallet_address": "0xRecipientAddress",
    "amount": 50,
    "reason": "Daily check-in reward"
  }'
```

---

## 🎨 Step 5: Frontend Integration

### 5.1: Install Dependencies

```bash
cd frontend
npm install ethers wagmi viem @rainbow-me/rainbowkit
```

### 5.2: Configure SOMNIA Chain

Create `frontend/src/config/chains.ts`:

```typescript
import { defineChain } from 'viem'

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'SOMNIA Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network/'] },
  },
  blockExplorers: {
    default: { 
      name: 'Shannon Explorer', 
      url: 'https://shannon-explorer.somnia.network' 
    },
  },
  testnet: true,
})

export const somniaMainnet = defineChain({
  id: 5031,
  name: 'SOMNIA Mainnet',
  nativeCurrency: { name: 'SOMI', symbol: 'SOMI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.infra.mainnet.somnia.network/'] },
  },
  blockExplorers: {
    default: { 
      name: 'SOMNIA Explorer', 
      url: 'https://explorer.somnia.network' 
    },
  },
})
```

### 5.3: Create Wagmi Config

Create `frontend/src/config/wagmi.ts`:

```typescript
import { createConfig, http } from 'wagmi'
import { somniaTestnet, somniaMainnet } from './chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [somniaTestnet, somniaMainnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [somniaTestnet.id]: http(),
    [somniaMainnet.id]: http(),
  },
})
```

### 5.4: Create Balance Component

Create `frontend/src/components/CareTokenBalance.tsx`:

```typescript
'use client'

import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'

const CARE_TOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function CareTokenBalance() {
  const { address, isConnected } = useAccount()
  const careTokenAddress = process.env.NEXT_PUBLIC_CARE_TOKEN_ADDRESS as `0x${string}`

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: careTokenAddress,
    abi: CARE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: symbol } = useReadContract({
    address: careTokenAddress,
    abi: CARE_TOKEN_ABI,
    functionName: 'symbol',
  })

  if (!isConnected) {
    return (
      <div className="care-balance-card">
        <p>Connect wallet to see your CARE balance</p>
      </div>
    )
  }

  if (balanceLoading) {
    return <div className="care-balance-card">Loading balance...</div>
  }

  const formattedBalance = balance ? formatEther(balance) : '0'

  return (
    <div className="care-balance-card">
      <div className="balance-label">Your CARE Balance</div>
      <div className="balance-amount">
        {parseFloat(formattedBalance).toLocaleString()} {symbol || 'CARE'}
      </div>
      <div className="balance-usd">
        {/* Add USD value calculation if needed */}
      </div>
    </div>
  )
}
```

### 5.5: Create Wallet Connect Button

Create `frontend/src/components/WalletConnect.tsx`:

```typescript
'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button onClick={() => disconnect()} className="btn-disconnect">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="wallet-connect">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="btn-connect"
        >
          Connect with {connector.name}
        </button>
      ))}
    </div>
  )
}
```

### 5.6: Update Environment Variables

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_CARE_TOKEN_ADDRESS=0xYourDeployedContractAddress
NEXT_PUBLIC_SOMNIA_CHAIN_ID=50312
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 5.7: Integrate into Layout

Update `frontend/src/app/layout.tsx`:

```typescript
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/config/wagmi'

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {/* Your existing layout */}
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
```

---

## 🧪 Step 6: Test Complete Integration

### 6.1: Test Reward Flow

1. **User completes daily check-in on frontend**
2. **Backend API receives check-in event**
3. **Backend mints CARE tokens:**

```python
# In your reward service
from app.services.care_token_service import get_care_token_service

async def reward_daily_checkin(user_id: int, user_wallet: str):
    care_service = get_care_token_service()
    
    result = await care_service.mint_reward(
        user_wallet=user_wallet,
        amount=10,  # 10 CARE tokens
        reason=f"Daily check-in reward for user {user_id}"
    )
    
    # Log transaction
    print(f"✅ Minted 10 CARE to {user_wallet}")
    print(f"TX: {result['tx_hash']}")
    
    return result
```

4. **Frontend displays updated balance**

### 6.2: Verify on Explorer

Visit Shannon Explorer:

```
https://shannon-explorer.somnia.network/address/YOUR_CONTRACT_ADDRESS
```

You should see:

- Contract deployed ✅
- Minting transactions ✅
- Token transfers ✅

---

## 🎯 Step 7: Mainnet Deployment (When Ready)

⚠️ **Only proceed after thorough testing on testnet!**

### 7.1: Get Real SOMI Tokens

You'll need real SOMI tokens for mainnet deployment:

- Purchase on exchanges
- Bridge from other chains
- Use official SOMNIA bridge

### 7.2: Create Mainnet Wallet

🔒 **SECURITY CRITICAL:**

- Use a **hardware wallet** (Ledger, Trezor)
- Never use the same private key as testnet
- Store private keys in secure vault
- Use multi-sig for admin role

### 7.3: Update Environment

```env
SOMNIA_MAINNET_RPC_URL=https://api.infra.mainnet.somnia.network/
MAINNET_PRIVATE_KEY=your_hardware_wallet_derived_key
```

### 7.4: Deploy to Mainnet

```bash
npx hardhat run scripts/deployCareToken.ts --network somniaMainnet
```

### 7.5: Verify Contract

Visit mainnet explorer:

```
https://explorer.somnia.network/address/YOUR_MAINNET_CONTRACT
```

### 7.6: Update All Environments

Update `.env` files across:

- Backend: Contract address, mainnet RPC
- Frontend: Contract address, chain ID (5031)
- Mobile apps (if any)

### 7.7: Grant Roles on Mainnet

Same process as testnet, but use mainnet contract address.

### 7.8: Announce Launch

- Update documentation
- Notify users
- Monitor transactions
- Be ready for support

---

## 📊 Monitoring & Maintenance

### Daily Checks

- [ ] Monitor token supply vs. max cap
- [ ] Check for unusual minting activity
- [ ] Review large transfers (>10,000 CARE)
- [ ] Verify backend logs for errors

### Weekly Reviews

- [ ] Audit role assignments
- [ ] Review token distribution
- [ ] Check user balances distribution
- [ ] Analyze reward effectiveness

### Monthly Tasks

- [ ] Full security audit
- [ ] Update documentation
- [ ] Review token economics
- [ ] Adjust reward rates if needed

### Monitoring Tools

1. **SOMNIA Explorer**: Track all transactions
2. **Backend Logs**: Monitor minting activity
3. **Database**: Track reward history
4. **Alerts**: Set up for:
   - Large transfers
   - Unusual minting patterns
   - Role changes
   - Contract pauses

---

## 🆘 Troubleshooting

### "Insufficient funds for gas"

- **Solution**: Get more STT from faucet or buy SOMI for mainnet

### "Transaction failed"

- **Causes**:
  - Insufficient gas
  - Minting would exceed max supply
  - No minter role
- **Solution**: Check error message, verify permissions

### "Cannot connect to RPC"

- **Solution**:
  - Check RPC URL in .env
  - Try alternative RPC (Stakely, Ankr)
  - Verify internet connection

### "Balance not updating on frontend"

- **Solution**:
  - Check contract address is correct
  - Verify wallet is on correct network
  - Refresh page or clear cache

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Compiled contract successfully
- [ ] Got testnet tokens (STT)
- [ ] Tested deployment script locally
- [ ] Backed up all private keys securely

### Deployment

- [ ] Deployed to SOMNIA testnet
- [ ] Saved contract address
- [ ] Verified on explorer
- [ ] Granted minter role to backend

### Backend Integration

- [ ] Updated .env with contract address
- [ ] Installed web3 dependencies
- [ ] Tested connection to blockchain
- [ ] Tested minting via API
- [ ] Added transaction logging

### Frontend Integration  

- [ ] Installed wagmi/ethers
- [ ] Configured SOMNIA chain
- [ ] Created balance component
- [ ] Added wallet connect button
- [ ] Tested on testnet

### Testing

- [ ] Minted test tokens successfully
- [ ] Transferred tokens between wallets
- [ ] Checked balance on frontend
- [ ] Viewed transactions on explorer
- [ ] Tested reward flow end-to-end

### Pre-Mainnet

- [ ] Completed 2+ weeks of testnet usage
- [ ] No critical bugs found
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team trained on operations

### Mainnet Launch

- [ ] Deployed to mainnet with hardware wallet
- [ ] Verified contract on mainnet explorer
- [ ] Updated all environment variables
- [ ] Granted roles on mainnet
- [ ] Announced to users
- [ ] Monitoring active

---

## 📚 Resources

- **SOMNIA Docs**: <https://docs.somnia.network/>
- **Testnet Explorer**: <https://shannon-explorer.somnia.network>
- **Mainnet Explorer**: <https://explorer.somnia.network>
- **Testnet Faucet**: <https://testnet.somnia.network/>
- **Discord Support**: <https://discord.gg/Somnia>

---

## 🎉 Success Metrics

After deployment, you should see:

- ✅ Contract deployed on SOMNIA testnet
- ✅ Backend can mint rewards
- ✅ Frontend displays balances
- ✅ Users can view transactions
- ✅ Tokens flowing in ecosystem

**Congratulations! Your $CARE token is now live! 🚀**

---

*Last updated: October 27, 2025*
