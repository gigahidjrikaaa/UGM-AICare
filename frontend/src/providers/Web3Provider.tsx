'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { defineChain } from 'viem';
import { useState, useEffect } from 'react';

// Define SOMNIA Testnet (Chain ID: 50312)
const somniaTestnet = defineChain({
  id: 50312,
  name: 'SOMNIA Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SOMNIA Testnet Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { 
      name: 'Shannon Explorer', 
      url: 'https://shannon-explorer.somnia.network' 
    },
  },
  testnet: true,
});

// Define SOMNIA Mainnet (Chain ID: 5031)
const somniaMainnet = defineChain({
  id: 5031,
  name: 'SOMNIA',
  network: 'somnia',
  nativeCurrency: {
    decimals: 18,
    name: 'SOMNIA',
    symbol: 'SOMNIA',
  },
  rpcUrls: {
    default: { http: ['https://rpc.somnia.network'] },
    public: { http: ['https://rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { 
      name: 'SOMNIA Explorer', 
      url: 'https://explorer.somnia.network' 
    },
  },
  testnet: false,
});

// Wagmi configuration with SOMNIA chains
const config = getDefaultConfig({
  appName: 'UGM-AICare',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE',
  chains: [somniaTestnet, somniaMainnet],
  ssr: true, // Enable Server-Side Rendering for Next.js
});

// React Query client for state management
const queryClient = new QueryClient();

/**
 * Web3Provider
 * 
 * Wraps the application with wagmi, RainbowKit, and React Query providers.
 * This enables multi-wallet support (MetaMask, WalletConnect, Coinbase Wallet, etc.)
 * 
 * Only mounts on client-side to prevent localStorage access during SSR
 * 
 * @param children - React children to wrap with providers
 */
export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render wallet providers during SSR to prevent localStorage errors
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
