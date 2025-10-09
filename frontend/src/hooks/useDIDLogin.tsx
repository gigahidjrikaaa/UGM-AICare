"use client"
import { useState } from "react"
import { ethers } from "ethers"

import type { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { isMetaMask?: boolean };
  }
}

export const useDIDLogin = () => {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const loginWithDID = async () => {
    try {
      setLoading(true)

      if (!window.ethereum) throw new Error("No wallet found")

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      const message = `Login to UGM-AICare as ${address} at ${Date.now()}`
      const signature = await signer.signMessage(message)

      const res = await fetch("/api/did-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Login failed")

      setToken(data.token)
      localStorage.setItem("aicare_token", data.token)

      return { token: data.token, address: data.address }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return { loginWithDID, loading, token }
}


