"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { ethers } from "ethers"

export default function AccountLinker() {
  const { data: session, status } = useSession()
  const [linkStatus, setLinkStatus] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const linkWallet = async () => {
    if (!window.ethereum) {
      setLinkStatus("❌ Wallet (like MetaMask) not detected.")
      return
    }

    try {
      setLoading(true)

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // Optional: sign a message to prove ownership
      const signature = await signer.signMessage("Linking DID to UGM-AICare")

      const token = session?.user?.token as string | undefined
      if (!token) {
        setLinkStatus("❌ No session token found. Please re-login.")
        return
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/link-did`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wallet_address: address,
          signature: signature,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setLinkStatus(`❌ Failed to link: ${data.detail || "Unknown error"}`)
      } else {
        setLinkStatus(`✅ Wallet linked successfully to ${data.address}`)
      }
    } catch (error) {
      console.error("Linking error:", error)
      setLinkStatus("❌ An error occurred while linking wallet.")
    } finally {
      setLoading(false)
    }
  }

  if (status !== "authenticated") {
    return <p className="text-red-600">Please log in first to link your wallet.</p>
  }

  return (
    <div className="p-4 border rounded-md max-w-md space-y-3">
      <h2 className="text-lg font-semibold">🔗 Link your wallet</h2>
      <button
        onClick={linkWallet}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        disabled={loading}
      >
        {loading ? "Linking..." : "Link Wallet"}
      </button>
      {linkStatus && <p>{linkStatus}</p>}
    </div>
  )
}
