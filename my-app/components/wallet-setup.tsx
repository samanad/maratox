"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Copy, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function WalletSetup() {
  const [copied, setCopied] = useState(false)

  const walletAddress = "0xa85BAC140e091e5b74c235F666e8C9849a7BBA55"

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
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
          <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">₮</span>
          </div>
          <CardTitle>USDT BEP20 Configuration</CardTitle>
        </div>
        <CardDescription>
          Your Binance Smart Chain wallet address for receiving USDT (via Etherscan V2 API)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">Receiving Address (BEP20)</p>
            <p className="font-mono text-sm break-all">{walletAddress}</p>
          </div>
          <Button variant="outline" size="icon" onClick={copyAddress}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        {copied && <p className="text-sm text-green-600">Address copied to clipboard!</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Badge variant="outline" className="justify-center p-2">
            <span className="text-xs">💰 USDT Only</span>
          </Badge>
          <Badge variant="outline" className="justify-center p-2">
            <span className="text-xs">⚡ Low Fees</span>
          </Badge>
          <Badge variant="outline" className="justify-center p-2">
            <span className="text-xs">🔗 Etherscan V2</span>
          </Badge>
        </div>

        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Etherscan V2 API Integration:</p>
              <ul className="space-y-1 text-xs">
                <li>• Using Etherscan V2 multi-chain API</li>
                <li>• Network: Binance Smart Chain (BSC)</li>
                <li>• Token Standard: BEP20</li>
                <li>• Chain ID: 56</li>
                <li>• API Endpoint: api-bsc.etherscan.io</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Only USDT on BEP20 network is accepted</p>
          <p>• Transaction fees are much lower than Ethereum network</p>
          <p>• Compatible with MetaMask, Trust Wallet, and Binance Wallet</p>
          <p>• Powered by Etherscan V2 multi-chain API</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              MetaMask
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://trustwallet.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Trust Wallet
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://bscscan.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              BSCScan
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
