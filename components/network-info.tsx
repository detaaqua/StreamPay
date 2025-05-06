"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"

export function NetworkInfo() {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-[#3498db]/10 to-[#3498db]/5 pb-4">
        <CardTitle className="flex items-center text-lg">
          <Globe className="mr-2 h-5 w-5 text-[#3498db]" />
          Network Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Network:</span>
            <span className="text-sm font-medium">Holesky Testnet</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Chain ID:</span>
            <span className="text-sm font-medium">17000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Native Token:</span>
            <span className="text-sm font-medium">Testnet ETH (ETH)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">RPC URL:</span>
            <span className="text-sm font-mono text-xs truncate">https://17000.rpc.thirdweb.com</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
