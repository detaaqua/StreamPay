"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CUSTOM_TOKEN_ADDRESS } from "@/lib/constants"

export function TokenHelper() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(CUSTOM_TOKEN_ADDRESS)
    setCopied(true)
    toast({
      title: "Address Copied",
      description: "Token address copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-4">
        <CardTitle className="flex items-center text-lg text-blue-800">
          <AlertCircle className="mr-2 h-5 w-5 text-blue-600" />
          Token Address Helper
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="token-address" className="text-sm font-medium">
              SPT Token Address (Copy this)
            </Label>
            <div className="flex mt-1.5">
              <Input
                id="token-address"
                value={CUSTOM_TOKEN_ADDRESS}
                readOnly
                className="font-mono text-sm rounded-r-none"
              />
              <Button onClick={copyToClipboard} variant="outline" className="rounded-l-none border-l-0" size="icon">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Troubleshooting Tips</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Make sure to copy the entire token address without any spaces</li>
                    <li>For ETH streams, use exactly: 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee</li>
                    <li>Check that you have tokens in your wallet before creating a stream</li>
                    <li>Ensure your wallet is connected to the correct network</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
