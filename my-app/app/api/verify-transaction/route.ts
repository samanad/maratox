import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { txHash, expectedAddress, expectedAmount } = await request.json()

    if (!txHash) {
      return NextResponse.json({ error: "Transaction hash is required" }, { status: 400 })
    }

    console.log("Verifying BSC transaction via Etherscan V2:", txHash, "Expected amount:", expectedAmount)

    // Etherscan V2 API endpoint for BSC
    const etherscanApiKey = process.env.BSCSCAN_API_KEY || "YMURRBM3WND7ZIJM8S1C5HEQXQK6W4S45B"
    const apiUrl = `https://api-bsc.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${etherscanApiKey}`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!response.ok || !data.result) {
      console.error("Etherscan V2 BSC API error:", data)
      return NextResponse.json(
        {
          error: "Transaction not found or invalid",
          apiResponse: data,
        },
        { status: 404 },
      )
    }

    const transaction = data.result
    console.log("Transaction data:", transaction)

    // Check if transaction is to our address
    const ourAddress = "0xa85BAC140e091e5b74c235F666e8C9849a7BBA55"

    // For USDT BEP20 transactions, we need to decode the input data
    const usdtContract = "0x55d398326f99059fF775485246999027B3197955"
    const isUsdtTransaction = transaction.to?.toLowerCase() === usdtContract.toLowerCase()

    let transferAmount = 0
    let transferTo = ""

    if (isUsdtTransaction && transaction.input && transaction.input.length > 10) {
      // Decode USDT transfer function call
      const input = transaction.input
      if (input.startsWith("0xa9059cbb")) {
        // Extract recipient address (bytes 4-36)
        const recipientHex = input.slice(34, 74)
        transferTo = "0x" + recipientHex.padStart(40, "0")

        // Extract amount (bytes 36-68)
        const amountHex = input.slice(74, 138)
        const amountWei = Number.parseInt(amountHex, 16)
        // USDT BEP20 has 18 decimals
        transferAmount = amountWei / Math.pow(10, 18)

        console.log("USDT BEP20 Transfer detected via Etherscan V2:", {
          to: transferTo,
          amount: transferAmount,
          ourAddress: ourAddress,
          expectedAmount: expectedAmount,
        })
      }
    }

    // Verify the transaction - allow small amounts with tolerance
    const amountTolerance = 0.001 // Allow 0.001 USDT tolerance for small amounts
    const isValidAmount = !expectedAmount || Math.abs(transferAmount - expectedAmount) <= amountTolerance
    const isValidRecipient = transferTo.toLowerCase() === ourAddress.toLowerCase()
    const isValidTransaction = isUsdtTransaction && isValidRecipient && transferAmount > 0

    if (isValidTransaction) {
      // Get transaction receipt for confirmation status
      const receiptUrl = `https://api-bsc.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${etherscanApiKey}`
      const receiptResponse = await fetch(receiptUrl)
      const receiptData = await receiptResponse.json()

      const confirmations = receiptData.result ? 1 : 0

      return NextResponse.json({
        success: true,
        transaction: {
          hash: txHash,
          to: transferTo,
          amount: transferAmount,
          confirmations: confirmations,
          status: receiptData.result?.status === "0x1" ? "confirmed" : "pending",
          blockNumber: transaction.blockNumber,
          amountMatch: isValidAmount,
          expectedAmount: expectedAmount,
          network: "bsc",
        },
        rawTransaction: transaction,
        rawReceipt: receiptData.result,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Transaction verification failed",
        details: {
          isUsdtTransaction,
          transferTo,
          transferAmount,
          expectedAmount,
          expectedAddress: ourAddress,
          amountMatch: isValidAmount,
          recipientMatch: isValidRecipient,
          network: "bsc",
        },
        rawTransaction: transaction,
      })
    }
  } catch (error) {
    console.error("Error verifying transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify transaction",
        errorDetails: error instanceof Error ? error.stack : "No details available",
      },
      { status: 500 },
    )
  }
}
