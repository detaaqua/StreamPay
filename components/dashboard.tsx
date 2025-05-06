"use client"

import { useEffect, useState, useCallback } from "react"
import { ethers } from "ethers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StreamList } from "@/components/stream-list"
import { CreateStreamForm } from "@/components/create-stream-form"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/constants"
import { ArrowDownUp, Send, Wallet2, RefreshCw } from "lucide-react"
import { TokenInfo } from "@/components/token-info"
import { NetworkInfo } from "@/components/network-info"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface DashboardProps {
  provider: ethers.BrowserProvider
  signer: ethers.Signer
  account: string
}

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

export function Dashboard({ provider, signer, account }: DashboardProps) {
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [sentStreams, setSentStreams] = useState<Stream[]>([])
  const [receivedStreams, setReceivedStreams] = useState<Stream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalSent, setTotalSent] = useState<string>("0.00")
  const [totalReceived, setTotalReceived] = useState<string>("0.00")
  const [totalWithdrawable, setTotalWithdrawable] = useState<string>("0.00")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize contract
  useEffect(() => {
    if (!signer) return

    const initContract = async () => {
      try {
        console.log("Initializing contract with address:", CONTRACT_ADDRESS)

        // Validate contract address
        if (!ethers.isAddress(CONTRACT_ADDRESS)) {
          console.error("Invalid contract address:", CONTRACT_ADDRESS)
          setIsLoading(false)
          return
        }

        // Create contract with signer
        const streamContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
        console.log("Contract initialized successfully")
        console.log("Contract target:", streamContract.target)

        setContract(streamContract)
        setIsLoading(false)
      } catch (error) {
        console.error("Error initializing contract:", error)
        setIsLoading(false)
      }
    }

    initContract()
  }, [signer])

  // Function to fetch a single stream by ID
  const fetchStream = useCallback(
    async (streamId: number): Promise<Stream | null> => {
      if (!contract) return null

      try {
        // Get basic stream info
        const [sender, recipient, tokenAddress, deposit, remaining, isActive] =
          await contract.getStreamBasicInfo(streamId)

        // Get time info
        const [startTime, stopTime, ratePerSecond, withdrawable] = await contract.getStreamTimeInfo(streamId)

        return {
          id: streamId,
          sender,
          recipient,
          tokenAddress,
          deposit,
          remaining,
          isActive,
          startTime: Number(startTime),
          stopTime: Number(stopTime),
          ratePerSecond,
          withdrawable,
        }
      } catch (error) {
        console.error(`Error fetching stream ${streamId}:`, error)
        return null
      }
    },
    [contract],
  )

  // Function to fetch all streams (using events)
  const fetchStreams = useCallback(async () => {
    if (!contract || !provider || !account) return

    setIsRefreshing(true)
    setIsLoading(true)

    try {
      // Get the current block number
      const currentBlock = await provider.getBlockNumber()

      // Look back 10000 blocks to find events (adjust as needed)
      const fromBlock = Math.max(0, currentBlock - 10000)

      // Get all StreamCreated events
      const createdFilter = contract.filters.StreamCreated()
      const createdEvents = await contract.queryFilter(createdFilter, fromBlock)

      // Get all StreamCancelled events
      const cancelledFilter = contract.filters.StreamCancelled()
      const cancelledEvents = await contract.queryFilter(cancelledFilter, fromBlock)

      // Create a map of cancelled stream IDs
      const cancelledStreamIds = new Set(cancelledEvents.map((event) => Number(event.args?.[0])))

      // Process created events
      const streamPromises = createdEvents.map(async (event) => {
        const streamId = Number(event.args?.[0])

        // Skip if the stream was cancelled
        if (cancelledStreamIds.has(streamId)) {
          return null
        }

        return fetchStream(streamId)
      })

      const streams = (await Promise.all(streamPromises)).filter((stream): stream is Stream => stream !== null)

      // Filter sent and received streams
      const sent = streams.filter((stream) => stream.sender.toLowerCase() === account.toLowerCase())
      const received = streams.filter((stream) => stream.recipient.toLowerCase() === account.toLowerCase())

      // Calculate totals
      let totalSentAmount = ethers.parseEther("0")
      let totalReceivedAmount = ethers.parseEther("0")
      let totalWithdrawableAmount = ethers.parseEther("0")

      sent.forEach((stream) => {
        totalSentAmount = totalSentAmount + stream.deposit
      })

      received.forEach((stream) => {
        totalReceivedAmount = totalReceivedAmount + (stream.deposit - stream.remaining)
        totalWithdrawableAmount = totalWithdrawableAmount + stream.withdrawable
      })

      // Update state
      setSentStreams(sent)
      setReceivedStreams(received)
      setTotalSent(ethers.formatEther(totalSentAmount))
      setTotalReceived(ethers.formatEther(totalReceivedAmount))
      setTotalWithdrawable(ethers.formatEther(totalWithdrawableAmount))

      toast({
        title: "Streams refreshed",
        description: `Found ${sent.length} sent and ${received.length} received streams`,
      })
    } catch (error) {
      console.error("Error fetching streams:", error)
      toast({
        title: "Error",
        description: "Failed to fetch streams. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [contract, provider, account, fetchStream])

  // Fetch streams on initial load and when account changes
  useEffect(() => {
    if (contract && provider && account) {
      fetchStreams()
    }
  }, [contract, provider, account, fetchStreams])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <Button
          onClick={fetchStreams}
          disabled={isRefreshing || !contract}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Streams"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Sent</p>
              <h3 className="text-2xl font-bold">{Number(totalSent).toFixed(4)} SPT</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#ebf5fd] flex items-center justify-center">
              <Send className="h-5 w-5 text-[#3498db]" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Active Streams:{" "}
              <span className="font-medium text-gray-700">{sentStreams.filter((s) => s.isActive).length}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Received</p>
              <h3 className="text-2xl font-bold">{Number(totalReceived).toFixed(4)} SPT</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#ebf5fd] flex items-center justify-center">
              <Wallet2 className="h-5 w-5 text-[#3498db]" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Withdrawable:{" "}
              <span className="font-medium text-gray-700">{Number(totalWithdrawable).toFixed(4)} SPT</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Streams</p>
              <h3 className="text-2xl font-bold">{sentStreams.length + receivedStreams.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#ebf5fd] flex items-center justify-center">
              <ArrowDownUp className="h-5 w-5 text-[#3498db]" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Active:{" "}
              <span className="font-medium text-green-600">
                {sentStreams.concat(receivedStreams).filter((s) => s.isActive).length}
              </span>{" "}
              | Paused:{" "}
              <span className="font-medium text-yellow-600">
                {sentStreams.concat(receivedStreams).filter((s) => !s.isActive).length}
              </span>
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="streams" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#f8f9fa] p-1 rounded-lg">
          <TabsTrigger
            value="streams"
            className="text-base rounded-md data-[state=active]:bg-white data-[state=active]:text-[#3498db] data-[state=active]:shadow-sm"
          >
            My Streams
          </TabsTrigger>
          <TabsTrigger
            value="create"
            className="text-base rounded-md data-[state=active]:bg-white data-[state=active]:text-[#3498db] data-[state=active]:shadow-sm"
          >
            Create Stream
          </TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-gray-800 flex items-center">
                <Send className="mr-2 h-5 w-5 text-[#3498db]" />
                Sent Streams
              </h3>
              <StreamList
                streams={sentStreams}
                account={account}
                contract={contract}
                type="sent"
                isLoading={isLoading}
                onRefresh={fetchStreams}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-medium text-gray-800 flex items-center">
                <Wallet2 className="mr-2 h-5 w-5 text-[#3498db]" />
                Received Streams
              </h3>
              <StreamList
                streams={receivedStreams}
                account={account}
                contract={contract}
                type="received"
                isLoading={isLoading}
                onRefresh={fetchStreams}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <CreateStreamForm
                contract={contract}
                account={account}
                provider={provider}
                onStreamCreated={fetchStreams}
              />
            </div>
            <div className="space-y-4">
              <TokenInfo provider={provider} account={account} />
              <NetworkInfo />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
