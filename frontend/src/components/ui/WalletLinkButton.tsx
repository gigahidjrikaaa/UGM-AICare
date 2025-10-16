"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import { FiCheckCircle, FiLink, FiLoader } from "react-icons/fi";

import apiClient from "@/services/api";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { isMetaMask?: boolean };
  }
}

export default function WalletLinkButton() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof session?.user?.wallet_address === "string") {
      setLinkedAddress(session.user.wallet_address);
    } else {
      setLinkedAddress(null);
    }
  }, [session?.user?.wallet_address]);

  const shortAddress = useMemo(() => {
    if (!linkedAddress) return null;
    return `${linkedAddress.slice(0, 6)}...${linkedAddress.slice(-4)}`;
  }, [linkedAddress]);

  const linkWallet = async () => {
    if (status !== "authenticated") {
      toast.error("Please sign in before linking a wallet.");
      return;
    }

    if (!window.ethereum) {
      toast.error("MetaMask not found. Please install MetaMask to continue.");
      return;
    }

    try {
      setLoading(true);

      const provider = new BrowserProvider(window.ethereum, "any");
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const signature = await signer.signMessage("Linking DID to UGM-AICare");

      const { data } = await apiClient.post("/link-did", {
        wallet_address: address,
        signature,
      });

      const normalisedAddress = data?.address ?? address;
      await update({ wallet_address: normalisedAddress });
      setLinkedAddress(normalisedAddress);

      toast.success("Wallet linked successfully!");
    } catch (error) {
      console.error("Failed to link wallet", error);

      const detail =
        (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail ??
        (error as Error).message ??
        "Something went wrong while linking your wallet.";

      if (detail.toLowerCase().includes("already linked")) {
        toast(detail);
      } else if (detail.toLowerCase().includes("user rejected")) {
        toast("Wallet connection was cancelled.");
      } else {
        toast.error(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
        <FiLoader className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (linkedAddress) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
        <FiCheckCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Wallet:</span>
        <code className="font-mono text-xs">{shortAddress}</code>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={linkWallet}
      disabled={loading || status !== "authenticated"}
      className="inline-flex items-center gap-2 rounded-full border border-[#FFCA40]/30 bg-[#FFCA40]/10 px-4 py-2 text-sm font-medium text-[#FFCA40] transition hover:bg-[#FFCA40]/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
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
  );
}
