import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const value = searchParams.get("value")
    const txid = searchParams.get("txid_in")

    console.log("Payment received:", {
      address,
      value: `${value} USDT`,
      txid,
      timestamp: new Date().toISOString(),
    })

    // Process payment here
    // Update database, send notifications, etc.

    return new NextResponse("*ok*", { status: 200 })
  } catch (error) {
    console.error("Error processing payment callback:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
