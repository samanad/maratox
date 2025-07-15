import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter required" }, { status: 400 })
    }

    console.log("Checking payment status for address:", address)

    // Use our new balance checking endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/check-address-balance?address=${address}`)

    if (!response.ok) {
      throw new Error("Failed to check address balance")
    }

    const data = await response.json()

    // Transform the response to match our interface
    const paymentInfo = {
      status: data.recentTransactions && data.recentTransactions.length > 0 ? "confirmed" : "pending",
      received: data.balance || 0,
      confirmations: data.recentTransactions?.[0]?.confirmations || 0,
      txid: data.recentTransactions?.[0]?.hash || undefined,
    }

    return NextResponse.json(paymentInfo)
  } catch (error) {
    console.error("Error checking payment status:", error)

    // Return a default pending status instead of error
    return NextResponse.json({
      status: "pending",
      received: 0,
      confirmations: 0,
      error: "Status check failed - using manual verification",
    })
  }
}
