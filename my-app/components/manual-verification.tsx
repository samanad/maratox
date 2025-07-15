"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ExternalLink, CheckCircle, AlertTriangle, Info } from "lucide-react"

interface ManualVerificationProps {
  address: string
  expectedAmount: number
  onVerificationSuccess: (txHash: string, amount: number) => void
}

interface VerificationResult {
  success: boolean
  transaction?: {
    hash: string
    amount: number
    status: string
    confirmations: number
  }
  error?: string
}

export function ManualVerification({ address, expectedAmount, onVerificationSuccess }: ManualVerificationProps) {
  const [txHash, setTxHash] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)

  const verifyTransaction = async () => {
    if (!txHash.trim()) return

    setIsVerifying(true)
    setResult(null)

    try {
      const response = await fetch("/api/verify-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: txHash.trim(),
          expectedAddress: address,
          expectedAmount: expectedAmount,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success && data.transaction) {
        onVerificationSuccess(data.transaction.hash, data.transaction.amount)
      }
    } catch (error) {
      setResult({
        success: false,
        error: "Verification failed - network error",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-lg">Manual Verification Required</CardTitle>
        </div>
        <CardDescription>
          Serverless environment limitations prevent automatic detection. Please verify your transaction manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">How to verify your payment:</p>
              <ol className="list-decimal pl-4 space-y-1 text-xs">
                <li>Send USDT BEP20 to the payment address</li>
                <li>Wait 1-2 minutes for blockchain confirmation</li>
                <li>Copy your transaction hash from your wallet</li>
                <li>Paste it below and click "Verify Transaction"</li>
                <li>Or check BSCScan directly using the button below</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Transaction Hash Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Transaction Hash</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter BSC transaction hash (0x...)"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="flex-1"
            />
            <Button onClick={verifyTransaction} disabled={!txHash.trim() || isVerifying}>
              <Search className="w-4 h-4 mr-1" />
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>

        {/* Verification Result */}
        {result && (
          <div
            className={`p-3 rounded-lg border ${
              result.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {result.success ? (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">✅ Transaction Verified!</p>
                  <p className="text-sm mt-1">
                    Amount: {result.transaction?.amount} USDT
                    <br />
                    Status: {result.transaction?.status}
                    <br />
                    Confirmations: {result.transaction?.confirmations}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium">❌ Verification Failed</p>
                  <p className="text-sm mt-1">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Direct BSCScan Link */}
        <div className="flex gap-2">
          <Button variant="outline" asChild className="flex-1 bg-transparent">
            <a
              href={`https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955?a=${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Check BSCScan Directly
            </a>
          </Button>
        </div>

        {/* Network Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-700 text-sm font-medium mb-2">Network Details</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• Network: Binance Smart Chain (BSC)</p>
            <p>• USDT Contract: 0x55d398326f99059fF775485246999027B3197955</p>
            <p>• Your Address: {address}</p>
            <p>• Expected Amount: {expectedAmount} USDT</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
