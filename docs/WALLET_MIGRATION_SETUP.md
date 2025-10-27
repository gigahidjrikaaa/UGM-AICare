# Wallet Integration Setup Guide

## 🚀 Migration Complete!

The wallet integration has been successfully migrated from MetaMask-only to **wagmi + RainbowKit**, supporting 100+ wallets!

## ✅ What's Been Done

1. **✅ Installed Dependencies**
   - @rainbow-me/rainbowkit
   - wagmi
   - viem@2.x
   - @tanstack/react-query

2. **✅ Created Web3Provider**
   - `frontend/src/providers/Web3Provider.tsx`
   - Configured SOMNIA Testnet (Chain ID: 50312)
   - Configured SOMNIA Mainnet (Chain ID: 5031)

3. **✅ Updated Root Layout**
   - `frontend/src/app/layout.tsx`
   - Wrapped app with Web3Provider

4. **✅ Replaced WalletLinkButton**
   - `frontend/src/components/ui/WalletLinkButton.tsx`
   - Now uses RainbowKit ConnectButton
   - Supports all wagmi-compatible wallets

5. **✅ Updated useDIDLogin Hook**
   - `frontend/src/hooks/useDIDLogin.tsx`
   - Now uses wagmi hooks (useAccount, useSignMessage)

6. **✅ Updated Environment Variables**
   - `frontend/env.example` now includes NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

---

## ⚠️ REQUIRED: Get WalletConnect Project ID

To enable mobile wallet support (WalletConnect), you need a free Project ID:

### Steps:

1. **Go to WalletConnect Cloud**
   ```
   https://cloud.walletconnect.com
   ```

2. **Sign Up / Sign In** (Free)
   - Use GitHub, Google, or email

3. **Create a New Project**
   - Click "New Project"
   - Project Name: `UGM-AICare`
   - Choose: Web

4. **Copy Your Project ID**
   - You'll see a Project ID like: `a1b2c3d4e5f6...`

5. **Add to Environment Variables**
   
   **Create `frontend/.env.local`:**
   ```bash
   # Copy all variables from env.example and add:
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

   **Or update existing `.env.local`:**
   ```bash
   # Add this line:
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

---

## 🧪 Testing the Integration

### 1. Start the Development Server

```bash
cd frontend
npm run dev
```

### 2. Test Wallet Connections

**Desktop Wallets:**
- ✅ MetaMask (browser extension)
- ✅ Coinbase Wallet (browser extension)
- ✅ Rainbow Wallet (browser extension)

**Mobile Wallets (via WalletConnect):**
- ✅ MetaMask Mobile
- ✅ Trust Wallet
- ✅ Rainbow Mobile
- ✅ Coinbase Wallet Mobile
- ✅ 100+ other wallets

### 3. Test Wallet Linking Flow

1. Navigate to page with WalletLinkButton
2. Click "Connect Wallet" (RainbowKit modal opens)
3. Select a wallet (MetaMask, WalletConnect, etc.)
4. Approve connection in wallet
5. Click "Link Digital Identity"
6. Sign message in wallet
7. Verify wallet is linked (green checkmark)

### 4. Test DID Login Flow

1. Use `useDIDLogin` hook in your component:
   ```tsx
   import { useDIDLogin } from '@/hooks/useDIDLogin';
   
   function LoginButton() {
     const { loginWithDID, isLoggingIn, isConnected } = useDIDLogin();
     
     return (
       <button 
         onClick={loginWithDID}
         disabled={!isConnected || isLoggingIn}
       >
         {isLoggingIn ? 'Logging in...' : 'Login with Wallet'}
       </button>
     );
   }
   ```

2. Connect wallet first
3. Click login button
4. Sign message
5. Verify JWT token stored

---

## 📊 What Changed?

### Before (MetaMask-Only)

```typescript
// Old code - vendor locked
if (!window.ethereum) {
  toast.error("MetaMask not found");
}
const provider = new BrowserProvider(window.ethereum);
```

### After (Multi-Wallet)

```typescript
// New code - supports 100+ wallets
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const { address, isConnected } = useAccount();
const { signMessageAsync } = useSignMessage();
```

---

## 🎨 UI Features

### ConnectButton (RainbowKit)

The new ConnectButton provides:
- 🎨 Beautiful, polished UI
- 📱 Responsive design (mobile-optimized)
- 🌙 Dark/light theme support
- 💼 Account modal with balance
- 🔄 Chain switcher
- 🔌 100+ wallet options

**Customization Options:**
```tsx
<ConnectButton 
  accountStatus={{
    smallScreen: 'avatar',
    largeScreen: 'full',
  }}
  chainStatus={{
    smallScreen: 'icon',
    largeScreen: 'full',
  }}
  showBalance={{
    smallScreen: false,
    largeScreen: true,
  }}
/>
```

---

## 🔒 Security Improvements

### Before
- ❌ Only MetaMask supported
- ❌ Direct window.ethereum access
- ⚠️ Manual error handling

### After
- ✅ 100+ wallets supported
- ✅ Secure provider abstraction
- ✅ Built-in error recovery
- ✅ SIWE (Sign-In with Ethereum) pattern
- ✅ Type-safe with TypeScript

---

## 🚨 Known Issues to Test

1. **Chain Switching**
   - Test switching between SOMNIA Testnet and Mainnet
   - Verify RPC endpoints are correct

2. **Session Persistence**
   - Refresh page and verify wallet stays connected
   - Test auto-connect on page load

3. **Multiple Wallet Types**
   - Test MetaMask
   - Test WalletConnect QR code
   - Test Coinbase Wallet

4. **Backend Compatibility**
   - Verify backend accepts signatures from any wallet
   - Test `/link-did` endpoint
   - Test `/api/did-login` endpoint

---

## 📝 Migration Checklist

- ✅ Dependencies installed
- ✅ Web3Provider created
- ✅ Layout updated
- ✅ WalletLinkButton replaced
- ✅ useDIDLogin hook updated
- ✅ Environment variables documented
- ⏳ WalletConnect Project ID (waiting for you)
- ⏳ Local testing
- ⏳ Integration testing
- ⏳ Production deployment

---

## 🆘 Troubleshooting

### Issue: "Project ID not found"

**Solution:** Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to `.env.local`

### Issue: WalletConnect QR doesn't work

**Solution:** 
1. Verify Project ID is correct
2. Check WalletConnect Cloud dashboard
3. Ensure mobile wallet app is updated

### Issue: Wallet connects but signing fails

**Solution:**
1. Check if user rejected signature
2. Verify message format in backend
3. Test with different wallet

### Issue: TypeScript errors

**Solution:**
```bash
cd frontend
npm run build
```
Fix any type errors shown

---

## 📚 Documentation Links

- **RainbowKit Docs:** https://www.rainbowkit.com/docs
- **wagmi Docs:** https://wagmi.sh
- **viem Docs:** https://viem.sh
- **WalletConnect Cloud:** https://cloud.walletconnect.com

---

## 🎯 Next Steps

1. **Get WalletConnect Project ID** (5 mins)
   - Visit https://cloud.walletconnect.com
   - Create free account
   - Create project
   - Copy Project ID

2. **Update .env.local** (1 min)
   ```bash
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id_here
   ```

3. **Test Locally** (30 mins)
   ```bash
   cd frontend
   npm run dev
   ```
   - Test MetaMask connection
   - Test WalletConnect QR code
   - Test wallet linking
   - Test DID login

4. **Deploy to Staging** (when ready)
   - Add Project ID to staging environment variables
   - Test in staging environment
   - Monitor for errors

5. **Deploy to Production** (when tested)
   - Add Project ID to production environment variables
   - Announce multi-wallet support to users
   - Monitor adoption metrics

---

## ✨ Benefits Achieved

### For Users
- 🎉 Can use ANY wallet (not just MetaMask)
- 📱 Mobile wallet support via WalletConnect
- 🎨 Beautiful, professional UI
- 🔒 More secure wallet connections

### For Developers
- 🧹 Cleaner, more maintainable code
- 🔧 TypeScript-first with excellent types
- 🚀 React hooks for all operations
- 📦 Smaller custom code footprint
- 🛡️ Battle-tested by top DeFi protocols

---

**Migration Status:** ✅ 90% Complete  
**Remaining:** Get WalletConnect Project ID → Test → Deploy  
**Estimated Time to Complete:** 30-60 minutes

---

*Document Created: October 27, 2025*  
*Last Updated: October 27, 2025*  
*Version: 1.0*
