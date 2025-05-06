"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { ConnectWallet } from "@/components/connect-wallet"
import { Dashboard } from "@/components/dashboard"
import { ThemeProvider } from "@/components/theme-provider"
import { ArrowRight, Clock, CreditCard, DollarSign, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // Check if MetaMask is installed
    const checkConnection = async () => {
      setIsInitializing(true)

      if (typeof window !== "undefined" && window.ethereum) {
        try {
          console.log("MetaMask detected, initializing provider")
          const provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(provider)

          // Listen for account changes
          window.ethereum.on("accountsChanged", (accounts: string[]) => {
            if (accounts.length > 0) {
              handleAccountsChanged(accounts)
            } else {
              setAccount(null)
              setSigner(null)
              setIsConnected(false)
            }
          })

          // Check if already connected
          const accounts = await provider.listAccounts()
          if (accounts.length > 0) {
            console.log("Found connected account:", accounts[0].address)
            try {
              const signer = await provider.getSigner()
              setAccount(accounts[0].address)
              setSigner(signer)
              setIsConnected(true)
            } catch (error) {
              console.error("Error getting signer:", error)
            }
          }
        } catch (error) {
          console.error("Error connecting to MetaMask:", error)
        }
      } else {
        console.log("MetaMask not detected")
      }

      setIsInitializing(false)
    }

    checkConnection()

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged")
      }
    }
  }, [])

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null)
      setSigner(null)
      setIsConnected(false)
      return
    }

    const account = accounts[0]
    setAccount(account)
    setIsConnected(true)

    if (provider) {
      try {
        console.log("Getting signer for account:", account)
        const signer = await provider.getSigner()
        setSigner(signer)
      } catch (error) {
        console.error("Error getting signer:", error)
        toast({
          title: "Error",
          description: "Failed to get signer. Please reconnect your wallet.",
          variant: "destructive",
        })
      }
    }
  }

  const connectWalletHandler = async () => {
    if (!provider) {
      toast({
        title: "Error",
        description: "MetaMask not detected. Please install MetaMask extension.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Requesting accounts from MetaMask")
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length > 0) {
        const account = accounts[0]
        console.log("Connected to account:", account)
        setAccount(account)
        setIsConnected(true)

        const signer = await provider.getSigner()
        setSigner(signer)
      }
    } catch (error) {
      console.error("Error connecting to MetaMask", error)
      toast({
        title: "Error",
        description: "Failed to connect to MetaMask. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <main className="min-h-screen bg-gradient-to-b from-white to-[#f8faff]">
        <ConnectWallet
          provider={provider}
          account={account}
          isConnected={isConnected}
          onAccountsChanged={handleAccountsChanged}
        />

        {isConnected && signer && provider ? (
          <Dashboard provider={provider} signer={signer} account={account as string} />
        ) : (
          <div className="container mx-auto px-4 py-12">
            <div className="grid gap-12 md:grid-cols-2 md:gap-8 items-center">
              <div className="space-y-6">
                <div className="inline-block rounded-lg bg-[#ebf5fd] px-3 py-1 text-sm text-[#3498db] font-medium">
                  Ethereum Payment Streaming
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                  Continuous Payment Streams on Ethereum
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Create real-time, programmable payment streams that transfer tokens continuously, second by second, to
                  any Ethereum address.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={connectWalletHandler}
                    disabled={!provider || isInitializing}
                    size="lg"
                    className="bg-[#3498db] hover:bg-[#2980b9] text-white font-medium px-8"
                  >
                    {isInitializing ? "Initializing..." : "Connect Wallet"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-[#3498db] text-[#3498db] hover:bg-[#ebf5fd] hover:text-[#2980b9]"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-[#3498db]/10 rounded-full filter blur-3xl opacity-70"></div>
                <div className="absolute -bottom-8 -right-8 w-72 h-72 bg-[#3498db]/10 rounded-full filter blur-3xl opacity-70"></div>
                <div className="relative bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-[#3498db]/10 to-[#3498db]/5">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Payment Stream</p>
                          <p className="text-xs text-gray-500">#ETH-1234</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        Active
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Sender</span>
                        <span className="text-sm font-medium">0x1a2b...3c4d</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Recipient</span>
                        <span className="text-sm font-medium">0x5e6f...7g8h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total Amount</span>
                        <span className="text-sm font-medium">10.0 ETH</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Remaining</span>
                        <span className="text-sm font-medium">7.5 ETH</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-[#3498db] h-2.5 rounded-full" style={{ width: "25%" }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Wallet className="mr-1 h-3 w-3" />
                        Withdraw
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-500 border-red-500 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-[#ebf5fd] flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-[#3498db]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Continuous Payments</h3>
                <p className="text-gray-600">
                  Stream payments in real-time, allowing recipients to withdraw funds as they accrue.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-[#ebf5fd] flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-[#3498db]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Flexible Control</h3>
                <p className="text-gray-600">
                  Pause, resume, or cancel streams at any time, giving you complete control over your payments.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-[#ebf5fd] flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-[#3498db]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Token Support</h3>
                <p className="text-gray-600">
                  Stream ETH or any ERC20 token to any Ethereum address with customizable parameters.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </ThemeProvider>
  )
}
