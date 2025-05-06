"use client"

import { useState } from "react"
import type { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut } from "lucide-react"

interface ConnectWalletProps {
  provider: ethers.BrowserProvider | null
  account: string | null
  isConnected: boolean
  onAccountsChanged: (accounts: string[]) => void
}

export function ConnectWallet({ provider, account, isConnected, onAccountsChanged }: ConnectWalletProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const connectWallet = async () => {
    if (!provider) return

    try {
      setIsConnecting(true)
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length > 0) {
        onAccountsChanged(accounts)
      }
    } catch (error) {
      console.error("Error connecting to MetaMask", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setIsConnecting(false)
    onAccountsChanged([])
  }

  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-[#3498db] flex items-center">
              <Wallet className="mr-2 h-6 w-6" />
              Stream Pay
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && account ? (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-[#f8f9fa] border border-gray-200">
                  <span className="text-sm text-gray-600">
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 border-[#3498db] text-[#3498db] hover:bg-[#ebf5fd] hover:text-[#2980b9]"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnecting || !provider}
                className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2980b9] text-white"
              >
                <Wallet className="h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
