"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiLink, FiLoader } from 'react-icons/fi';
import apiClient from '@/services/api';

/**
 * WalletLinkButton Component
 * 
 * Provides multi-wallet connection via RainbowKit and links wallet to user's UGM-AICare account.
 * Supports 100+ wallets including MetaMask, WalletConnect, Coinbase Wallet, etc.
 * 
 * Features:
 * - Multi-wallet support (no vendor lock-in)
 * - Beautiful RainbowKit UI
 * - Sign-in with Ethereum (SIWE) pattern
 * - Session integration with NextAuth
 */
export default function WalletLinkButton() {
  const { data: session, status, update } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [isLinking, setIsLinking] = useState(false);
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);

  // Sync linked address from session
  useEffect(() => {
    if (typeof session?.user?.wallet_address === 'string') {
      setLinkedAddress(session.user.wallet_address);
    } else {
      setLinkedAddress(null);
    }
  }, [session?.user?.wallet_address]);

  // Check if currently connected wallet is already linked
  const isCurrentWalletLinked = useMemo(() => {
    if (!address || !linkedAddress) return false;
    return address.toLowerCase() === linkedAddress.toLowerCase();
  }, [address, linkedAddress]);

  const shortAddress = useMemo(() => {
    if (!linkedAddress) return null;
    return `${linkedAddress.slice(0, 6)}...${linkedAddress.slice(-4)}`;
  }, [linkedAddress]);

  const handleLinkWallet = async () => {
    if (status !== 'authenticated') {
      toast.error('Please sign in before linking a wallet.');
      return;
    }

    if (!isConnected || !address) {
      toast.error('Please connect your wallet first.');
      return;
    }

    setIsLinking(true);

    try {
      // Sign message to prove wallet ownership
      const message = 'Linking DID to UGM-AICare';
      const signature = await signMessageAsync({ message });

      // Send to backend
      const { data } = await apiClient.post('/link-did', {
        wallet_address: address,
        signature,
      });

      const normalisedAddress = data?.address ?? address;
      
      // Update session with new wallet address
      await update({ wallet_address: normalisedAddress });
      setLinkedAddress(normalisedAddress);

      toast.success('Wallet linked successfully!');
    } catch (error: unknown) {
      console.error('Failed to link wallet', error);

      const detail =
        (error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail ??
        (error as Error)?.message ??
        'Something went wrong while linking your wallet.';

      if (detail.toLowerCase().includes('already linked')) {
        toast(detail);
      } else if (detail.toLowerCase().includes('user rejected')) {
        toast('Wallet signature was cancelled.');
      } else {
        toast.error(detail);
      }
    } finally {
      setIsLinking(false);
    }
  };

  // Show loading state during session initialization
  if (status === 'loading') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
        <FiLoader className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* RainbowKit Connect Button - Supports 100+ wallets */}
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

      {/* Link Button - Only show if authenticated, connected, but not linked */}
      {status === 'authenticated' && isConnected && !isCurrentWalletLinked && (
        <button
          type="button"
          onClick={handleLinkWallet}
          disabled={isLinking}
          className="inline-flex items-center gap-2 rounded-full border border-[#FFCA40]/30 bg-[#FFCA40]/10 px-4 py-2 text-sm font-medium text-[#FFCA40] transition hover:bg-[#FFCA40]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLinking ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Linking...</span>
            </>
          ) : (
            <>
              <FiLink className="h-4 w-4" />
              <span>Link Digital Identity</span>
            </>
          )}
        </button>
      )}

      {/* Linked Status - Show if wallet is linked */}
      {linkedAddress && isCurrentWalletLinked && (
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
          <FiCheckCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Wallet:</span>
          <code className="font-mono text-xs">{shortAddress}</code>
        </div>
      )}

      {/* Warning - Connected to different wallet than linked */}
      {linkedAddress && isConnected && !isCurrentWalletLinked && (
        <div className="text-xs text-yellow-400/80">
          ℹ️ Connected wallet differs from linked wallet ({shortAddress})
        </div>
      )}
    </div>
  );
}

