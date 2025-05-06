"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CUSTOM_TOKEN_ADDRESS, CUSTOM_TOKEN_ABI } from "@/lib/constants"
import { toast } from "@/hooks/use-toast"
import { Coins, RefreshCw } from "lucide-react"

interface TokenInfoProps {
  provider: ethers.BrowserProvider
  account: string
}

export function TokenInfo({ provider, account }: TokenInfoProps) {
  const [tokenName, setTokenName] = useState<string>("")
  const [tokenSymbol, setTokenSymbol] = useState<string>("")
  const [tokenBalance, setTokenBalance] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(true)
  const [isFauceting, setIsFauceting] = useState(false)

  useEffect(() => {
    if (!provider || !account) return

    const fetchTokenInfo = async () => {
      try {
        setIsLoading(true)
        const signer = await provider.getSigner()
        const tokenContract = new ethers.Contract(CUSTOM_TOKEN_ADDRESS, CUSTOM_TOKEN_ABI, signer)

        // Fetch token info
        const [name, symbol, decimals, balance] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.balanceOf(account),
        ])

        setTokenName(name)
        setTokenSymbol(symbol)
        setTokenBalance(ethers.formatUnits(balance, decimals))
      } catch (error) {
        console.error("Error fetching token info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenInfo()
  }, [provider, account])

  const handleFaucet = async () => {
    if (!provider || !account) return

    try {
      setIsFauceting(true)
      const signer = await provider.getSigner()
      const tokenContract = new ethers.Contract(CUSTOM_TOKEN_ADDRESS, CUSTOM_TOKEN_ABI, signer)

      // Request tokens from faucet (10 tokens)
      const amount = ethers.parseEther("10")
      const tx = await tokenContract.faucet(amount)

      toast({
        title: "Faucet Request Sent",
        description: "Waiting for transaction confirmation...",
      })

      await tx.wait()

      // Refresh balance
      const balance = await tokenContract.balanceOf(account)
      const decimals = await tokenContract.decimals()
      setTokenBalance(ethers.formatUnits(balance, decimals))

      toast({
        title: "Tokens Received",
        description: `You received 10 ${tokenSymbol} tokens!`,
      })
    } catch (error: any) {
      console.error("Error using faucet:", error)
      toast({
        title: "Faucet Error",
        description: error.message || "Failed to get tokens from faucet",
        variant: "destructive",
      })
    } finally {
      setIsFauceting(false)
    }
  }

  const refreshBalance = async () => {
    if (!provider || !account) return

    try {
      setIsLoading(true)
      const signer = await provider.getSigner()
      const tokenContract = new ethers.Contract(CUSTOM_TOKEN_ADDRESS, CUSTOM_TOKEN_ABI, signer)

      const balance = await tokenContract.balanceOf(account)
      const decimals = await tokenContract.decimals()
      setTokenBalance(ethers.formatUnits(balance, decimals))

      toast({
        title: "Balance Updated",
        description: "Your token balance has been refreshed",
      })
    } catch (error) {
      console.error("Error refreshing balance:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-[#3498db]/10 to-[#3498db]/5 pb-4">
        <CardTitle className="flex items-center text-lg">
          <Coins className="mr-2 h-5 w-5 text-[#3498db]" />
          {isLoading ? "Loading Token Info..." : `${tokenName} (${tokenSymbol})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Token Address:</span>
            <span className="text-sm font-mono">
              {CUSTOM_TOKEN_ADDRESS.substring(0, 6)}...{CUSTOM_TOKEN_ADDRESS.substring(CUSTOM_TOKEN_ADDRESS.length - 4)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Your Balance:</span>
            <div className="flex items-center">
              <span className="text-lg font-semibold mr-2">{Number.parseFloat(tokenBalance).toFixed(4)}</span>
              <span className="text-sm text-gray-500">{tokenSymbol}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-6 w-6"
                onClick={refreshBalance}
                disabled={isLoading}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleFaucet}
            disabled={isFauceting || isLoading}
            className="mt-2 bg-[#3498db] hover:bg-[#2980b9] text-white"
          >
            {isFauceting ? "Getting Tokens..." : `Get 10 ${tokenSymbol} Tokens`}
          </Button>

          <p className="text-xs text-gray-500 mt-2">
            This token can be used for testing the payment streaming functionality. Use the faucet to get test tokens.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
