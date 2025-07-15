"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, ExternalLink, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function TonWalletSetup() {
  const [copied, setCopied] = useState(false)

  const tonAddress = process.env.NEXT_PUBLIC_TON_WALLET_ADDRESS || "EQD...your-ton-address"

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(tonAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <CardTitle>TON Wallet Configuration</CardTitle>
        </div>
        <CardDescription>Your TON wallet address for receiving payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">Receiving Address</p>
            <p className="font-mono text-sm break-all">{tonAddress}</p>
          </div>
          <Button variant="outline" size="icon" onClick={copyAddress}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        {copied && <p className="text-sm text-green-600">Address copied to clipboard!</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Badge variant="outline" className="justify-center p-2">
            <span className="text-xs">✅ USDT Support</span>
          </Badge>
          <Badge variant="outline" className="justify-center p-2">
            <span className="text-xs">⚡ Fast Confirmations</span>
          </Badge>
          <Badge variant="outline" className="justify-center p-2">
            <span className="text-xs">🔒 Secure</span>
          </Badge>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Supports USDT, USDC, and other TON tokens</p>
          <p>• Payments typically confirm within 1-2 minutes</p>
          <p>• Compatible with Tonkeeper, TON Wallet, and other TON wallets</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://tonkeeper.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Tonkeeper
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://wallet.ton.org" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              TON Wallet
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
