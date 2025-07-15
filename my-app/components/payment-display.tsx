"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, RefreshCw, ExternalLink, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PaymentData, PaymentRequest } from "@/app/page"
import { ManualVerification } from "./manual-verification"

interface PaymentDisplayProps {
  paymentData: PaymentData
  paymentRequest: PaymentRequest
  onReset: () => void
}

interface PaymentStatus {
  confirmed: boolean
  transactions?: any[]
  balance?: number
  apiStatus?: any
  debugInfo?: any
}

export function PaymentDisplay({ paymentData, paymentRequest, onReset }: PaymentDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<"pending" | "confirmed">("pending")
  const [isChecking, setIsChecking] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [showManualVerification, setShowManualVerification] = useState(false)

  const handleManualVerificationSuccess = (txHash: string, amount: number) => {
    setStatus("confirmed")
    setPaymentStatus((prev) => ({
      ...prev,
      confirmed: true,
      debugInfo: {
        ...prev?.debugInfo,
        manualVerification: {
          txHash,
          amount,
          verifiedAt: new Date().toISOString(),
        },
      },
    }))
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const checkPayment = async () => {
    setIsChecking(true)
    setCheckCount((prev) => prev + 1)
    try {
      const response = await fetch(
        `/api/check-payment?address=${paymentData.address_in}&amount=${paymentRequest.amount}`,
      )

      const data = await response.json()
      setPaymentStatus(data)

      if (data.confirmed) {
        setStatus("confirmed")
      }

      setLastChecked(new Date())
    } catch (error) {
      console.error("Error checking payment:", error)
      setPaymentStatus({
        confirmed: false,
        debugInfo: {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkPayment() // Initial check

    if (status === "pending") {
      const interval = setInterval(checkPayment, 10000) // Check every 10 seconds
      return () => clearInterval(interval)
    }
  }, [status])

  useEffect(() => {
    if (paymentStatus?.manualMode) {
      setShowManualVerification(true)
    }
  }, [paymentStatus?.manualMode])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payment Details</CardTitle>
          <Badge variant={status === "confirmed" ? "default" : "secondary"}>
            {status === "confirmed" ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Confirmed
              </>
            ) : (
              "Pending"
            )}
          </Badge>
        </div>
        {lastChecked && (
          <p className="text-xs text-gray-500">
            Last checked: {lastChecked.toLocaleTimeString()} (Check #{checkCount})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="payment" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border">
                <img
                  src={paymentData.qr_code || "/placeholder.svg"}
                  alt="Payment QR Code"
                  className="w-48 h-48"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      paymentData.address_in,
                    )}`
                  }}
                />
              </div>
            </div>

            {/* Payment Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Send USDT (BEP20) to:</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-gray-50 rounded font-mono text-sm break-all">
                  {paymentData.address_in}
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(paymentData.address_in)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-sm text-green-600">Address copied!</p>}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount:</label>
              <div className="p-3 bg-blue-50 rounded font-mono text-lg font-bold text-blue-800">
                {paymentRequest.amount} USDT
              </div>
            </div>

            {/* Network Info */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm font-medium">⚠️ Important:</p>
              <p className="text-yellow-700 text-xs mt-1">
                Send USDT on Binance Smart Chain (BEP20) network only. Other networks will result in loss of funds.
              </p>
            </div>

            {status === "confirmed" && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm font-medium">✅ Payment Confirmed!</p>
                <p className="text-green-700 text-xs mt-1">Your payment has been received and confirmed.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Expected</p>
                <p className="font-mono text-lg">{paymentRequest.amount} USDT</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className="font-mono text-lg">{paymentStatus?.balance || 0} USDT</p>
              </div>
            </div>

            {/* API Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">API Status</p>
                <Badge variant={paymentStatus?.apiStatus?.status === "1" ? "outline" : "destructive"}>
                  {paymentStatus?.apiStatus?.status === "1" ? "OK" : "Error"}
                </Badge>
              </div>

              {paymentStatus?.apiStatus && (
                <div className="p-3 bg-gray-50 rounded-lg text-xs">
                  <p>
                    <strong>Status:</strong> {paymentStatus.apiStatus.status}
                  </p>
                  <p>
                    <strong>Message:</strong> {paymentStatus.apiStatus.message}
                  </p>
                  {paymentStatus.apiStatus.result && (
                    <p>
                      <strong>Result:</strong> {paymentStatus.apiStatus.result}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            {paymentStatus?.transactions && paymentStatus.transactions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Recent USDT Transactions</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {paymentStatus.transactions.map((tx: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded text-xs bg-gray-50">
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

            {/* Auto-check Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Auto-Check</p>
                <p className="text-xs text-gray-500">Checking every 10 seconds</p>
              </div>
              <Badge variant={status === "pending" ? "default" : "secondary"}>
                {status === "pending" ? "Active" : "Stopped"}
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            {/* API Configuration */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">API Configuration</p>
              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Endpoint:</strong> api-bsc.etherscan.io
                </p>
                <p>
                  <strong>Network:</strong> Binance Smart Chain (BSC)
                </p>
                <p>
                  <strong>USDT Contract:</strong> 0x55d398326f99059fF775485246999027B3197955
                </p>
                <p>
                  <strong>Your Address:</strong> {paymentData.address_in}
                </p>
                <p>
                  <strong>API Key:</strong> {process.env.BSCSCAN_API_KEY ? "Configured" : "Missing"}
                </p>
              </div>
            </div>

            {/* Request/Response Debug */}
            {paymentStatus?.debugInfo && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Debug Information</p>
                <div className="p-3 bg-gray-50 rounded-lg max-h-60 overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(paymentStatus.debugInfo, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* API Error Help */}
            {paymentStatus?.apiStatus?.status !== "1" && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">API Error Detected</p>
                    <p className="mt-1">{paymentStatus?.apiStatus?.message}</p>

                    {paymentStatus?.apiStatus?.message?.includes("Invalid API Key") && (
                      <div className="mt-2 text-xs">
                        <p className="font-medium">Fix API Key Issue:</p>
                        <ol className="list-decimal pl-4 mt-1 space-y-1">
                          <li>
                            Go to{" "}
                            <a href="https://bscscan.com/apis" target="_blank" className="underline" rel="noreferrer">
                              bscscan.com/apis
                            </a>
                          </li>
                          <li>Create account and verify email</li>
                          <li>Generate new API key</li>
                          <li>Add as BSCSCAN_API_KEY environment variable</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Network Information */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">BSC Network Details</p>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    <li>Chain ID: 56</li>
                    <li>RPC: https://bsc-dataseed.binance.org/</li>
                    <li>Explorer: https://bscscan.com</li>
                    <li>USDT Decimals: 18</li>
                    <li>Gas Token: BNB</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {showManualVerification && (
          <ManualVerification
            address={paymentData.address_in}
            expectedAmount={paymentRequest.amount}
            onVerificationSuccess={handleManualVerificationSuccess}
          />
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={checkPayment} disabled={isChecking} className="flex-1 bg-transparent">
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={`https://bscscan.com/address/${paymentData.address_in}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
          <Button variant="outline" onClick={onReset}>
            New Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
