"use client"

import { useState, useEffect } from "react"
import type { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CONTRACT_ADDRESS } from "@/lib/constants"
import { AlertCircle, Bug, RefreshCw } from "lucide-react"

interface ContractDebugProps {
  provider: ethers.BrowserProvider
  contract: ethers.Contract | null
}

export function ContractDebug({ provider, contract }: ContractDebugProps) {
  const [contractTarget, setContractTarget] = useState<string>("Not available")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    updateContractInfo()
  }, [contract])

  const updateContractInfo = () => {
    if (contract) {
      try {
        const target = contract.target
        setContractTarget(typeof target === "string" ? target : "Invalid target type")
      } catch (error) {
        console.error("Error getting contract target:", error)
        setContractTarget("Error getting target")
      }
    } else {
      setContractTarget("Contract not initialized")
    }
  }

  const checkContract = async () => {
    setIsLoading(true)
    try {
      if (!provider) {
        setContractTarget("Provider not available")
        return
      }

      const code = await provider.getCode(CONTRACT_ADDRESS)
      const isDeployed = code !== "0x"

      setContractTarget(`${contract?.target || "Not available"} (${isDeployed ? "Deployed" : "Not deployed"})`)
    } catch (error) {
      console.error("Error checking contract:", error)
      setContractTarget("Error checking contract")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 pb-4">
        <CardTitle className="flex items-center text-lg text-amber-800">
          <Bug className="mr-2 h-5 w-5 text-amber-600" />
          Contract Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Contract Address:</span>
              <span className="text-sm font-mono">{CONTRACT_ADDRESS}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-700">Contract Target:</span>
              <span className="text-sm font-mono">{contractTarget}</span>
            </div>
          </div>

          <Button onClick={checkContract} disabled={isLoading} variant="outline" className="w-full">
            {isLoading ? "Checking..." : "Check Contract"}
            <RefreshCw className="ml-2 h-4 w-4" />
          </Button>

          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Debug Information</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    This information is useful for debugging contract connection issues. If the contract target shows
                    "Not available" or an error, there might be an issue with the contract initialization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
