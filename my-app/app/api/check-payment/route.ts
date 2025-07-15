import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const expectedAmount = searchParams.get("amount")

    if (!address || !expectedAmount) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const etherscanApiKey = process.env.BSCSCAN_API_KEY || "YMURRBM3WND7ZIJM8S1C5HEQXQK6W4S45B"
    const usdtContract = "0x55d398326f99059fF775485246999027B3197955"

    // Check for recent USDT transactions using Etherscan API for BSC
    const apiUrl = `https://api-bsc.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&page=1&offset=10&sort=desc&apikey=${etherscanApiKey}`

    const response = await fetch(apiUrl)
    const data = await response.json()

    let confirmed = false

    if (data.status === "1" && data.result && Array.isArray(data.result)) {
      const recentTx = data.result.find((tx: any) => {
        const txAmount = Number.parseInt(tx.value) / Math.pow(10, Number.parseInt(tx.tokenDecimal))
        const txTime = new Date(Number.parseInt(tx.timeStamp) * 1000)
        const isRecent = Date.now() - txTime.getTime() < 3600000 // Within last hour
        const isToAddress = tx.to.toLowerCase() === address.toLowerCase()
        const isExpectedAmount = Math.abs(txAmount - Number.parseFloat(expectedAmount)) < 0.001

        return isRecent && isToAddress && isExpectedAmount
      })

      if (recentTx) {
        confirmed = true
      }
    }

    return NextResponse.json({ confirmed })
  } catch (error) {
    console.error("Error checking payment:", error)
    return NextResponse.json({ confirmed: false })
  }
}
