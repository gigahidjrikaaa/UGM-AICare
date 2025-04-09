"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ethers } from "ethers"
import apiClient from "@/services/api"
import { FiLink, FiCheckCircle, FiLoader, FiCopy } from 'react-icons/fi';

export default function AccountLinker() {
  const { data: session, status, update } = useSession()
  const [linkStatus, setLinkStatus] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Wallet address from session, updated via useEffect
  const [linkedAddress, setLinkedAddress] = useState<string | null | undefined>(undefined);

  // Update local state when session changes
  useEffect(() => {
    setLinkedAddress(session?.user?.wallet_address);
  }, [session?.user?.wallet_address]); // Depend on the specific session field

  const linkWallet = async () => {
    if (status !== "authenticated") {
      setLinkStatus("❌ Please log in first.");
      return;
   }
    if (!window.ethereum) {
      setLinkStatus("❌ Wallet (like MetaMask) not detected.")
      return
    }

    try {
      setLoading(true)
      setLinkStatus("") // Reset status message

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // Optional: sign a message to prove ownership
      const signature = await signer.signMessage("Linking DID to UGM-AICare")
      
      // Use the apiClient - Authorization header is now added automatically
      const response = await apiClient.post( // Use relative path if baseURL is set
          '/link-did', // apiClient automatically adds base URL
          {
            wallet_address: address,
            signature: signature, // Send signature if backend expects it
          }
      );

      // --- Update session after successful linking ---
      await update({ wallet_address: response.data.address }); // Trigger session update
      setLinkedAddress(response.data.address); // Update local state immediately
      setLinkStatus(`✅ Wallet linked: ${response.data.address.substring(0, 6)}...${response.data.address.substring(response.data.address.length - 4)}`)
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { detail?: string } }; message?: string };
      const detail = errorObj.response?.data?.detail || errorObj.message || "An error occurred while linking wallet.";
      if (detail.includes("already linked")) {
        setLinkStatus(`⚠️ ${detail}`);
      } else {
        setLinkStatus(`❌ Failed to link: ${detail}`)
      }
      console.error("Linking error:", error);
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (linkedAddress) {
      navigator.clipboard.writeText(linkedAddress).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
      }, (err) => {
        console.error('Failed to copy address: ', err);
        setLinkStatus("❌ Failed to copy address.");
      });
    }
  };


  // Display loading state while session is checked
  if (status === "loading" || linkedAddress === undefined) {
     return (
       <div className="p-4 border border-gray-700 rounded-md max-w-md space-y-3 bg-gray-800/50 animate-pulse">
          <div className="h-6 w-3/4 bg-gray-600 rounded"></div>
          <div className="h-10 w-1/2 bg-gray-600 rounded"></div>
       </div>
     )
   }

   return (
    <div className="p-4 border border-gray-700 rounded-md max-w-md space-y-3 bg-gray-800/50 text-white">
      <h2 className="text-lg font-semibold flex items-center">
         <FiLink className="mr-2 text-blue-400"/> Link Digital Identity (DID)
      </h2>

       {status !== "authenticated" ? (
         <p className="text-yellow-400 text-sm">Please log in to manage wallet linking.</p>
       ) : linkedAddress ? (
         // Wallet is linked - Display info
         <div className="space-y-2">
            <p className="text-sm text-green-400 flex items-center">
                <FiCheckCircle className="mr-2"/> Wallet Linked
            </p>
            <div className="flex items-center justify-between bg-gray-700 p-2 rounded">
                 <code className="text-xs text-gray-300 truncate">
                     {linkedAddress}
                 </code>
                 <button
                    onClick={copyToClipboard}
                    className="ml-2 p-1 text-gray-400 hover:text-white transition"
                    title="Copy address"
                 >
                    {copySuccess ? <FiCheckCircle className="text-green-400"/> : <FiCopy size={14} />}
                 </button>
            </div>
            {/* Optional: Add an "Unlink" button here if needed */}
         </div>
       ) : (
         // Wallet not linked - Show button
         <>
            <p className="text-sm text-gray-400">
                Connect your blockchain wallet (e.g., MetaMask) to associate your DID.
            </p>
            <button
              onClick={linkWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center transition w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? (
                 <>
                    <FiLoader className="animate-spin mr-2"/> Linking...
                 </>
              ) : (
                 "Link Wallet"
              )}
            </button>
         </>
       )}

      {/* Display Status/Error Message */}
      {linkStatus && (
          <p className={`text-xs mt-2 ${linkStatus.startsWith('✅') || linkStatus.startsWith('⚠️') ? 'text-green-400' : 'text-red-400'}`}>
            {linkStatus}
          </p>
      )}
    </div>
  )
}