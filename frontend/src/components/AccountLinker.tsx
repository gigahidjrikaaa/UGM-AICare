"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { ethers } from "ethers"
import apiClient from "@/services/api"

export default function AccountLinker() {
  const { status } = useSession()
  const [linkStatus, setLinkStatus] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

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

      // The response interceptor in apiClient handles general errors (like 401)
      // Here, handle specific success/failure logic for this endpoint
      setLinkStatus(`✅ Wallet linked successfully to ${response.data.address}`)
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { detail?: string } }; message?: string };
      const detail = errorObj.response?.data?.detail || errorObj.message || "An error occurred while linking wallet.";
      setLinkStatus(`❌ Failed to link: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") return <p>Loading session...</p>;

  return (
    <div className="p-4 border rounded-md max-w-md space-y-3">
      <h2 className="text-lg font-semibold">🔗 Link your wallet</h2>
       {status !== "authenticated" ? (
         <p className="text-yellow-500 text-sm">Please log in to link your wallet.</p>
       ) : (
         <button
           onClick={linkWallet}
           className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
           disabled={loading}
         >
           {loading ? "Linking..." : "Link Wallet"}
         </button>
       )}
      {linkStatus && <p className={`text-sm ${linkStatus.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{linkStatus}</p>}
    </div>
  )
}
