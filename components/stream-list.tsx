"use client"

import type { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Play, Pause, X, ArrowDownToLine } from "lucide-react"
import { formatEther } from "ethers"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface Stream {
  id: number
  sender: string
  recipient: string
  tokenAddress: string
  deposit: ethers.BigNumber
  remaining: ethers.BigNumber
  isActive: boolean
  startTime: number
  stopTime: number
  ratePerSecond: ethers.BigNumber
  withdrawable: ethers.BigNumber
}

interface StreamListProps {
  streams: Stream[]
  account: string
  contract: ethers.Contract | null
  type: "sent" | "received"
  isLoading: boolean
  onRefresh: () => void
}

export function StreamList({ streams, account, contract, type, isLoading, onRefresh }: StreamListProps) {
  const [processingStreamId, setProcessingStreamId] = useState<number | null>(null)

  const handleCancelStream = async (streamId: number) => {
    if (!contract) return

    try {
      setProcessingStreamId(streamId)
      const tx = await contract.cancelStream(streamId)
      await tx.wait()
      toast({
        title: "Stream cancelled",
        description: "The stream has been successfully cancelled.",
      })
      onRefresh()
    } catch (error) {
      console.error("Error cancelling stream:", error)
      toast({
        title: "Error",
        description: "Failed to cancel the stream. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingStreamId(null)
    }
  }

  const handlePauseStream = async (streamId: number) => {
    if (!contract) return

    try {
      setProcessingStreamId(streamId)
      const tx = await contract.pauseStream(streamId)
      await tx.wait()
      toast({
        title: "Stream paused",
        description: "The stream has been successfully paused.",
      })
      onRefresh()
    } catch (error) {
      console.error("Error pausing stream:", error)
      toast({
        title: "Error",
        description: "Failed to pause the stream. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingStreamId(null)
    }
  }

  const handleResumeStream = async (streamId: number) => {
    if (!contract) return

    try {
      setProcessingStreamId(streamId)
      const tx = await contract.resumeStream(streamId)
      await tx.wait()
      toast({
        title: "Stream resumed",
        description: "The stream has been successfully resumed.",
      })
      onRefresh()
    } catch (error) {
      console.error("Error resuming stream:", error)
      toast({
        title: "Error",
        description: "Failed to resume the stream. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingStreamId(null)
    }
  }

  const handleWithdraw = async (streamId: number, withdrawable: ethers.BigNumber) => {
    if (!contract) return

    try {
      setProcessingStreamId(streamId)
      const tx = await contract.withdrawFromStream(streamId, withdrawable)
      await tx.wait()
      toast({
        title: "Withdrawal successful",
        description: "Funds have been successfully withdrawn.",
      })
      onRefresh()
    } catch (error) {
      console.error("Error withdrawing from stream:", error)
      toast({
        title: "Error",
        description: "Failed to withdraw from the stream. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingStreamId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border border-gray-200 overflow-hidden">
            <CardHeader className="pb-2 bg-gray-50">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="pb-2 pt-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 pt-4">
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (streams.length === 0) {
    return (
      <Card className="border border-gray-200 bg-gray-50">
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">No {type} streams found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {streams.map((stream) => (
        <Card key={stream.id} className="border border-gray-200 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-[#3498db]/10 to-[#3498db]/5 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-[#3498db]">Stream #{stream.id}</CardTitle>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${stream.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
              >
                {stream.isActive ? "Active" : "Paused"}
              </div>
            </div>
            <CardDescription>
              {type === "sent" ? "To: " : "From: "}
              <span className="font-mono">
                {type === "sent"
                  ? `${stream.recipient.substring(0, 6)}...${stream.recipient.substring(stream.recipient.length - 4)}`
                  : `${stream.sender.substring(0, 6)}...${stream.sender.substring(stream.sender.length - 4)}`}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2 pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-medium">{formatEther(stream.deposit)} SPT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Remaining:</span>
                <span className="font-medium">{formatEther(stream.remaining)} SPT</span>
              </div>
              {type === "received" && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Withdrawable:</span>
                  <span className="font-medium">{formatEther(stream.withdrawable)} SPT</span>
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-[#3498db] h-2 rounded-full"
                  style={{
                    width: `${100 - (Number(stream.remaining) * 100) / Number(stream.deposit)}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 pt-4 border-t border-gray-100">
            {type === "sent" && (
              <>
                {stream.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                    onClick={() => handlePauseStream(stream.id)}
                    disabled={processingStreamId === stream.id}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleResumeStream(stream.id)}
                    disabled={processingStreamId === stream.id}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleCancelStream(stream.id)}
                  disabled={processingStreamId === stream.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}

            {type === "received" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-[#3498db] border-[#3498db] hover:bg-[#ebf5fd]"
                onClick={() => handleWithdraw(stream.id, stream.withdrawable)}
                disabled={processingStreamId === stream.id || stream.withdrawable.isZero()}
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                Withdraw
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
