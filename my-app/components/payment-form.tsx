"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PaymentRequest } from "@/app/page"

interface PaymentFormProps {
  onSubmit: (request: PaymentRequest) => void
  isLoading: boolean
  disabled: boolean
}

export function PaymentForm({ onSubmit, isLoading, disabled }: PaymentFormProps) {
  const [amount, setAmount] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    const numAmount = Number.parseFloat(amount)
    if (numAmount <= 0) return

    const callbackUrl = `${window.location.origin}/api/payment-callback`

    onSubmit({
      cryptocurrency: "usdt",
      amount: numAmount,
      callbackUrl,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDT)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={!amount || isLoading || disabled}>
            {isLoading ? "Creating..." : "Create Payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
