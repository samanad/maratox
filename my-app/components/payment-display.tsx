"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, RefreshCw, ExternalLink, CheckCircle } from "lucide-react"
import type { PaymentData, PaymentRequest } from "@/app/page"

interface PaymentDisplayProps {
  paymentData: PaymentData
  paymentRequest: PaymentRequest
  onReset: () => void
}

export function PaymentDisplay({ paymentData, paymentRequest, onReset }: PaymentDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<"pending" | "confirmed">("pending")
  const [isChecking, setIsChecking] = useState(false)

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
    try {
      const response = await fetch(
        `/api/check-payment?address=${paymentData.address_in}&amount=${paymentRequest.amount}`,
      )
      if (response.ok) {
        const data = await response.json()
        if (data.confirmed) {
          setStatus("confirmed")
        }
      }
    } catch (error) {
      console.error("Error checking payment:", error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (status === "pending") {
      const interval = setInterval(checkPayment, 10000) // Check every 10 seconds
      return () => clearInterval(interval)
    }
  }, [status])

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
      </CardHeader>
      <CardContent className="space-y-6">
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
            <div className="flex-1 p-3 bg-gray-50 rounded font-mono text-sm break-all">{paymentData.address_in}</div>
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
