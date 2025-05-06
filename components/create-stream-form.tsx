"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { ERC20_ABI, CUSTOM_TOKEN_ADDRESS } from "@/lib/constants"
import { ArrowRight, Calendar, Clock, CreditCard, Send, User, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CreateStreamFormProps {
  contract: ethers.Contract | null
  account: string
  provider: ethers.BrowserProvider
  onStreamCreated: () => void
}

// Token options
const TOKEN_OPTIONS = [
  { value: CUSTOM_TOKEN_ADDRESS, label: "SPT (StreamPay Token)" },
]

export function CreateStreamForm({ contract, account, provider, onStreamCreated }: CreateStreamFormProps) {
  const [recipient, setRecipient] = useState("")
  const [selectedToken, setSelectedToken] = useState("")
  const [amount, setAmount] = useState("")
  const [duration, setDuration] = useState("")
  const [startTime, setStartTime] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [minStartTime, setMinStartTime] = useState("")

  // Set minimum start time to current time + 5 minutes
  useEffect(() => {
    const now = new Date()
    // Add 5 minutes to current time to ensure it's in the future
    now.setMinutes(now.getMinutes() + 5)

    // Format for datetime-local input
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")

    setMinStartTime(`${year}-${month}-${day}T${hours}:${minutes}`)
  }, [])

  // Tambahkan fungsi untuk memeriksa dan melakukan approve token ERC20
  const checkAndApproveToken = async (tokenAddress: string, amount: bigint) => {
    try {
      console.log("Checking token address format:", tokenAddress)
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error("Invalid token address format")
      }

      // Pastikan kontrak streaming payment sudah diinisialisasi
      if (!contract) {
        throw new Error("Stream contract not initialized")
      }

      // Pastikan alamat kontrak streaming payment valid
      const contractAddress = contract.target
      if (!contractAddress || !ethers.isAddress(contractAddress)) {
        console.error("Invalid contract address:", contractAddress)
        throw new Error("Invalid stream contract address")
      }

      console.log("Stream contract address:", contractAddress)
      console.log("Checking allowance for token:", tokenAddress)

      const signer = await provider.getSigner()
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

      // Periksa allowance saat ini
      const currentAllowance = await tokenContract.allowance(account, contractAddress)
      console.log("Current allowance:", ethers.formatEther(currentAllowance), "ETH")

      // Jika allowance kurang dari jumlah yang diperlukan, lakukan approve
      if (currentAllowance < amount) {
        console.log("Approving token spend...")

        // Tampilkan toast untuk memberi tahu pengguna
        toast({
          title: "Approval Required",
          description: "Please approve the token spend in your wallet",
        })

        const approveTx = await tokenContract.approve(contractAddress, amount)

        // Tampilkan toast bahwa transaksi approval sedang diproses
        toast({
          title: "Approving Token",
          description: "Please wait while the approval transaction is being processed...",
        })

        await approveTx.wait()

        // Tampilkan toast bahwa approval berhasil
        toast({
          title: "Approval Successful",
          description: "Token approval successful. Creating stream...",
        })

        return true
      } else {
        console.log("Sufficient allowance already exists")
        return true
      }
    } catch (error: any) {
      console.error("Error in token approval:", error)
      console.error("Token address that caused the error:", tokenAddress)
      console.error("Contract address:", contract?.target || "null")
      toast({
        title: "Approval Failed",
        description: `Failed to approve token: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
      return false
    }
  }

  // Modifikasi fungsi handleCreateStream untuk menggunakan fungsi checkAndApproveToken
  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contract || !provider) {
      toast({
        title: "Error",
        description: "Contract or provider not available. Please reconnect your wallet.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)

      // Validate inputs
      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address")
      }

      if (!selectedToken) {
        throw new Error("Please select a token")
      }

      const tokenAddress = selectedToken

      // Pastikan format amount benar (gunakan titik sebagai desimal)
      const amountStr = amount.replace(",", ".")
      const amountWei = ethers.parseEther(amountStr)
      if (amountWei <= 0n) {
        throw new Error("Amount must be greater than 0")
      }

      const durationSeconds = Number.parseInt(duration) * 60 * 60 * 24 // Convert days to seconds
      if (durationSeconds <= 0) {
        throw new Error("Duration must be greater than 0")
      }

      // Calculate start and stop times
      let startTimeUnix: number

      if (startTime) {
        // Use selected start time
        startTimeUnix = Math.floor(new Date(startTime).getTime() / 1000)

        // Ensure start time is in the future (at least current time + 2 minutes)
        const minStartTimeUnix = Math.floor(Date.now() / 1000) + 120
        if (startTimeUnix < minStartTimeUnix) {
          throw new Error("Start time must be at least 2 minutes in the future")
        }
      } else {
        // If no start time selected, use current time + 2 minutes
        startTimeUnix = Math.floor(Date.now() / 1000) + 120
      }

      console.log("Start time (Unix):", startTimeUnix)
      console.log("Current time (Unix):", Math.floor(Date.now() / 1000))

      const stopTimeUnix = startTimeUnix + durationSeconds
      console.log("Stop time (Unix):", stopTimeUnix)

      // Get the signer
      const signer = await provider.getSigner()
      if (!signer) {
        throw new Error("Signer not available. Please reconnect your wallet.")
      }

      // Check if token is ETH or ERC20
      if (tokenAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        // ETH stream
        console.log("Creating ETH stream with params:", {
          recipient,
          amountWei: amountWei.toString(),
          tokenAddress,
          startTimeUnix,
          stopTimeUnix,
        })

        const tx = await contract.createStream(recipient, amountWei, tokenAddress, startTimeUnix, stopTimeUnix, {
          value: amountWei,
        })

        await tx.wait()
      } else {
        // ERC20 stream
        console.log("Creating ERC20 stream with token address:", tokenAddress)

        // Validate token contract
        if (!ethers.isAddress(tokenAddress)) {
          throw new Error("Invalid token address format")
        }

        // Approve token spend if needed
        const approvalSuccess = await checkAndApproveToken(tokenAddress, amountWei)
        if (!approvalSuccess) {
          throw new Error("Token approval failed")
        }

        console.log("Creating stream...")
        const tx = await contract.createStream(recipient, amountWei, tokenAddress, startTimeUnix, stopTimeUnix)
        await tx.wait()
      }

      toast({
        title: "Stream created",
        description: "Your payment stream has been successfully created.",
      })

      // Reset form
      setRecipient("")
      setSelectedToken("")
      setAmount("")
      setDuration("")
      setStartTime("")

      // Refresh streams
      onStreamCreated()
    } catch (error: any) {
      console.error("Error creating stream:", error)

      // Handle specific error messages
      let errorMessage = error.message || "Failed to create stream. Please try again."

      if (errorMessage.includes("start time before current time")) {
        errorMessage = "Start time must be in the future. Please select a future start time."
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="border border-gray-200 max-w-2xl mx-auto overflow-hidden">
      <div className="bg-gradient-to-r from-[#3498db]/10 to-[#3498db]/5 px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-xl text-gray-800 flex items-center">
          <Send className="mr-2 h-5 w-5 text-[#3498db]" />
          Create New Payment Stream
        </CardTitle>
        <CardDescription>Set up a continuous payment stream to any Ethereum address</CardDescription>
      </div>
      <CardContent className="p-6">
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Start time must be at least 2 minutes in the future to ensure the transaction is processed correctly.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleCreateStream} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="recipient" className="flex items-center text-sm font-medium">
                <User className="mr-2 h-4 w-4 text-gray-500" />
                Recipient Address
              </Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                className="border-gray-300 focus:border-[#3498db] focus:ring-[#3498db]/20"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tokenAddress" className="flex items-center text-sm font-medium">
                <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                Select Token
              </Label>
              <Select value={selectedToken} onValueChange={setSelectedToken} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  {TOKEN_OPTIONS.map((token) => (
                    <SelectItem key={token.value} value={token.value}>
                      {token.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount" className="flex items-center text-sm font-medium">
                <ArrowRight className="mr-2 h-4 w-4 text-gray-500" />
                Amount
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="1.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="border-gray-300 focus:border-[#3498db] focus:ring-[#3498db]/20"
              />
              <p className="text-xs text-gray-500 ml-6">Use dot (.) or comma (,) as decimal separator</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration" className="flex items-center text-sm font-medium">
                <Clock className="mr-2 h-4 w-4 text-gray-500" />
                Duration (days)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="border-gray-300 focus:border-[#3498db] focus:ring-[#3498db]/20"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="startTime" className="flex items-center text-sm font-medium">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                Start Time
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min={minStartTime}
                className="border-gray-300 focus:border-[#3498db] focus:ring-[#3498db]/20"
              />
              <p className="text-xs text-gray-500 ml-6">If not specified, stream will start 2 minutes from now</p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-medium"
            disabled={isCreating || !contract || !provider}
          >
            {isCreating ? "Creating Stream..." : "Create Stream"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
