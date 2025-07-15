import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (amount < 0.01 || amount > 10000) {
      return NextResponse.json({ error: "Amount must be between 0.01 and 10000 USDT" }, { status: 400 })
    }

    // Your receiving address
    const myAddress = "0xa85BAC140e091e5b74c235F666e8C9849a7BBA55"

    // Generate QR code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(myAddress)}`

    return NextResponse.json({
      address_in: myAddress,
      address_out: myAddress,
      callback_url: `${request.nextUrl.origin}/api/payment-callback`,
      qr_code: qrCodeUrl,
      minimum: 0.01,
    })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
  }
}
