"use client"

import { useState } from "react"
import { PaymentForm } from "@/components/payment-form"
import { PaymentDisplay } from "@/components/payment-display"

export interface PaymentData {
  address_in: string
  address_out: string
  callback_url: string
  qr_code: string
  minimum: number
}

export interface PaymentRequest {
  cryptocurrency: string
  amount: number
  callbackUrl: string
}

export default function UsdtPaymentPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePaymentRequest = async (request: PaymentRequest) => {
    setIsLoading(true)
    setError(null)
    setPaymentRequest(request)

    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create payment")
      }

      const data = await response.json()
      setPaymentData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setPaymentData(null)
    setPaymentRequest(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">USDT Payment</h1>
          <p className="text-gray-600">Send USDT on BSC Network</p>
        </div>

        {!paymentData ? (
          <div>
            <PaymentForm onSubmit={handlePaymentRequest} isLoading={isLoading} disabled={!!paymentData} />
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <PaymentDisplay paymentData={paymentData} paymentRequest={paymentRequest!} onReset={handleReset} />
        )}
      </div>
    </div>
  )
}
