"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertCircle, RefreshCw, ExternalLink, Search, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentStatusProps {
  address: string
  cryptocurrency: string
  expectedAmount: number
}

interface PaymentInfo {
  status: "pending" | "confirmed" | "failed"
  received: number
  confirmations: number
  txid?: string
  message?: string
  error?: string
}

interface TransactionVerification {
  success: boolean
  transaction?: {
    hash: string
    to: string
    amount: number
    confirmations: number
    status: string
    blockNumber: string
  }
  error?: string
}

export function PaymentStatus({ address, cryptocurrency, expectedAmount }: PaymentStatusProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    status: "pending",
    received: 0,
    confirmations: 0,
  })
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [manualTxHash, setManualTxHash] = useState("")
  const [verificationResult, setVerificationResult] = useState<TransactionVerification | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [manualMode, setManualMode] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkAddressBalance = async () => {
    setIsChecking(true)
    setCheckCount((prev) => prev + 1)
    try {
      const response = await fetch(
        `/api/check-address-balance?address=${address}&expectedAmount=${expectedAmount.toString()}`,
      )
      if (response.ok) {
        const data = await response.json()
        console.log("Address balance data:", data)
        setDebugInfo(JSON.stringify(data, null, 2))

        // Check if we're in manual mode
        if (data.manualMode) {
          setManualMode(true)
          setAutoCheckEnabled(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
        }

        // Store API status
        if (data.apiStatus) {
          setApiStatus(data.apiStatus)
        }

        // Check if we have recent transactions
        if (data.recentTransactions && data.recentTransactions.length > 0) {
          setRecentTransactions(data.recentTransactions)
        }

        // Check if we have a matching transaction
        if (data.matchingTransaction) {
          const tx = data.matchingTransaction
          setPaymentInfo({
            status: "confirmed",
            received: tx.value,
            confirmations: tx.confirmations,
            txid: tx.hash,
          })
        }

        setLastChecked(new Date())
      } else {
        const errorData = await response.json()
        console.error("Error response from API:", errorData)
        setDebugInfo(JSON.stringify(errorData, null, 2))

        // Check if this is a manual mode response
        if (errorData.manualMode) {
          setManualMode(true)
          setAutoCheckEnabled(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
        }
      }
    } catch (error) {
      console.error("Error checking address balance:", error)
      setDebugInfo(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      // Switch to manual mode on network errors
      setManualMode(true)
      setAutoCheckEnabled(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    } finally {
      setIsChecking(false)
    }
  }

  const verifyManualTransaction = async () => {
    if (!manualTxHash.trim()) return

    setIsChecking(true)
    setVerificationResult(null)

    try {
      const response = await fetch("/api/verify-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: manualTxHash.trim(),
          expectedAddress: address,
          expectedAmount: expectedAmount,
        }),
      })

      const result = await response.json()
      setVerificationResult(result)
      setDebugInfo(JSON.stringify(result, null, 2))

      if (result.success && result.transaction) {
        setPaymentInfo({
          status: result.transaction.status === "confirmed" ? "confirmed" : "pending",
          received: result.transaction.amount,
          confirmations: result.transaction.confirmations,
          txid: result.transaction.hash,
        })
      }
    } catch (error) {
      console.error("Error verifying transaction:", error)
      setVerificationResult({
        success: false,
        error: "Failed to verify transaction - using manual mode",
      })
      setDebugInfo(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Check balance immediately
    checkAddressBalance()

    // Setup interval for checking (only if not in manual mode)
    if (autoCheckEnabled && paymentInfo.status !== "confirmed" && !manualMode) {
      intervalRef.current = setInterval(checkAddressBalance, 30000) // Check every 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [address, expectedAmount, autoCheckEnabled, manualMode])

  // Stop checking if payment is confirmed
  useEffect(() => {
    if (paymentInfo.status === "confirmed" && intervalRef.current) {
      clearInterval(intervalRef.current)
      setAutoCheckEnabled(false)
    }
  }, [paymentInfo.status])

  const toggleAutoCheck = () => {
    if (manualMode) return // Can't enable auto-check in manual mode

    if (autoCheckEnabled) {
      // Turning off
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setAutoCheckEnabled(false)
    } else {
      // Turning on
      checkAddressBalance() // Check immediately
      intervalRef.current = setInterval(checkAddressBalance, 30000)
      setAutoCheckEnabled(true)
    }
  }

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
    }

    switch (paymentInfo.status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusBadge = () => {
    if (manualMode) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          Manual Mode
        </Badge>
      )
    }

    switch (paymentInfo.status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Waiting for Payment</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Payment Status</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {manualMode
            ? "Manual verification required due to network restrictions"
            : "Monitoring BSC blockchain for USDT transactions"}
          {lastChecked && !manualMode && (
            <span className="block text-xs mt-1">
              Last checked: {lastChecked.toLocaleTimeString()} (Checks: {checkCount})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue={manualMode ? "manual" : "status"}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="manual">Manual Verify</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            {/* Manual Mode Warning */}
            {manualMode && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Manual Verification Required</p>
                    <p className="text-xs">
                      Network restrictions prevent automatic transaction detection. Please use manual verification or
                      check BSCScan directly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Expected</p>
                <p className="font-mono text-lg">{expectedAmount} USDT</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Received</p>
                <p className="font-mono text-lg">{paymentInfo.received} USDT</p>
              </div>
            </div>

            {paymentInfo.confirmations > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Confirmations</p>
                <p className="font-mono">{paymentInfo.confirmations}</p>
              </div>
            )}

            {/* Auto-check toggle (disabled in manual mode) */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Auto-Check</p>
                <p className="text-xs text-gray-500">
                  {manualMode ? "Disabled (manual mode)" : "Check every 30 seconds"}
                </p>
              </div>
              <Button
                variant={autoCheckEnabled && !manualMode ? "default" : "outline"}
                size="sm"
                onClick={toggleAutoCheck}
                disabled={manualMode}
                className={autoCheckEnabled && !manualMode ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {manualMode ? "Manual" : autoCheckEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Recent USDT Transactions</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {recentTransactions.map((tx, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded text-xs ${
                        tx.isExpectedAmount && tx.isRecent && tx.isToOurAddress
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="font-mono">{tx.value} USDT</p>
                        <p className="text-gray-500">{new Date(tx.timestamp).toLocaleString()}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://bscscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paymentInfo.txid && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Transaction ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded flex-1">{paymentInfo.txid}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://bscscan.com/tx/${paymentInfo.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      BSCScan
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              {paymentInfo.status === "pending" && !manualMode && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                  Monitoring for USDT payment...
                </div>
              )}

              {manualMode && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                  Use manual verification →
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={checkAddressBalance}
                disabled={isChecking}
                className="ml-auto bg-transparent"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Check Now
                  </>
                )}
              </Button>
            </div>

            {paymentInfo.status === "confirmed" && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm font-medium">✅ Payment Confirmed!</p>
                <p className="text-green-700 text-xs mt-1">
                  Your USDT payment of {paymentInfo.received} USDT has been successfully received and confirmed on BSC.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-600">Manual Transaction Verification</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter BSC transaction hash (0x...)"
                  value={manualTxHash}
                  onChange={(e) => setManualTxHash(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={verifyManualTransaction} disabled={!manualTxHash.trim() || isChecking}>
                  <Search className="w-4 h-4 mr-1" />
                  Verify
                </Button>
              </div>

              {verificationResult && (
                <div
                  className={`p-3 rounded-lg border ${
                    verificationResult.success
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {verificationResult.success ? (
                    <div>
                      <p className="font-medium">✅ Transaction Verified!</p>
                      <p className="text-sm mt-1">
                        Amount: {verificationResult.transaction?.amount} USDT
                        <br />
                        Status: {verificationResult.transaction?.status}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">❌ Verification Failed</p>
                      <p className="text-sm mt-1">{verificationResult.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Direct BSCScan Link */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm font-medium mb-2">🔗 Check BSCScan Directly</p>
                <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                  <a
                    href={`https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955?a=${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View USDT Transactions on BSCScan
                  </a>
                </Button>
              </div>

              {/* Help Section */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700 text-sm font-medium mb-1">Manual Verification Steps</p>
                <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
                  <li>Send USDT BEP20 to the payment address</li>
                  <li>Wait 1-2 minutes for blockchain confirmation</li>
                  <li>Copy your transaction hash from your wallet</li>
                  <li>Paste it above and click "Verify"</li>
                  <li>Or check BSCScan directly using the link above</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">API Status</p>
                <Badge variant={apiStatus?.txStatus === "1" ? "outline" : "destructive"}>
                  {manualMode ? "Manual Mode" : apiStatus?.txStatus === "1" ? "OK" : "Error"}
                </Badge>
              </div>

              {manualMode && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-orange-600 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <p className="font-medium">Manual Mode Active</p>
                      <p className="mt-1">
                        Network restrictions prevent automatic API calls. Use manual verification or check BSCScan
                        directly.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-gray-600 mt-4">Debug Information</p>
              <div className="p-3 bg-gray-50 rounded-lg max-h-60 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">{debugInfo}</pre>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">BSC Network Information</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Network: Binance Smart Chain (BSC)</li>
                      <li>USDT Contract: 0x55d398326f99059fF775485246999027B3197955</li>
                      <li>Your Address: {address}</li>
                      <li>Expected Amount: {expectedAmount} USDT</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
