import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const expectedAmount = searchParams.get("expectedAmount")

    if (!address) {
      return NextResponse.json({ error: "Address parameter required" }, { status: 400 })
    }

    const ourAddress = "0xa85BAC140e091e5b74c235F666e8C9849a7BBA55"
    const usdtContract = "0x55d398326f99059fF775485246999027B3197955" // USDT BEP20 contract

    // Check if we have a valid Etherscan API key
    const etherscanApiKey = process.env.BSCSCAN_API_KEY || "YMURRBM3WND7ZIJM8S1C5HEQXQK6W4S45B"

    console.log("Checking USDT BEP20 transactions for address:", ourAddress)
    console.log("Expected amount:", expectedAmount || "Any amount")
    console.log("Using Etherscan API key:", etherscanApiKey.substring(0, 8) + "...")

    // Try multiple API endpoints with different configurations
    const apiEndpoints = [
      `https://api-bsc.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${ourAddress}&page=1&offset=20&sort=desc&apikey=${etherscanApiKey}`,
      `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${ourAddress}&page=1&offset=20&sort=desc&apikey=${etherscanApiKey}`,
      // Fallback to a simple balance check
      `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${usdtContract}&address=${ourAddress}&tag=latest&apikey=${etherscanApiKey}`,
    ]

    let txData = null
    let lastError = null
    let workingEndpoint = null

    // Try each endpoint
    for (const endpoint of apiEndpoints) {
      try {
        console.log("Trying endpoint:", endpoint.replace(etherscanApiKey, "***"))

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CryptoPaymentBot/1.0)",
            Accept: "application/json",
          },
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const responseText = await response.text()
          try {
            txData = JSON.parse(responseText)
            workingEndpoint = endpoint
            console.log("✅ Successfully connected to:", endpoint.split("?")[0])
            break
          } catch (parseError) {
            console.log("❌ JSON parse error for endpoint:", endpoint.split("?")[0])
            lastError = `JSON parse error: ${parseError instanceof Error ? parseError.message : "Unknown"}`
          }
        } else {
          console.log("❌ HTTP error for endpoint:", endpoint.split("?")[0], "Status:", response.status)
          lastError = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (fetchError) {
        console.log("❌ Fetch error for endpoint:", endpoint.split("?")[0])
        lastError = fetchError instanceof Error ? fetchError.message : "Unknown fetch error"

        // If it's a network restriction, break early
        if (fetchError instanceof Error && fetchError.message.includes("fetch failed")) {
          console.log("🚫 Network restrictions detected - switching to manual mode")
          break
        }
      }
    }

    // If all API calls failed, return a manual verification mode
    if (!txData) {
      console.log("⚠️ All API endpoints failed, switching to manual verification mode")
      return NextResponse.json({
        error: "API connectivity issues - manual verification required",
        address: ourAddress,
        balance: 0,
        recentTransactions: [],
        lastChecked: new Date().toISOString(),
        apiStatus: {
          txStatus: "0",
          txMessage: `Network restrictions prevent API access. Last error: ${lastError}`,
          balanceStatus: "0",
          balanceMessage: "Manual verification required",
        },
        manualMode: true,
        network: "bsc",
        debugInfo: {
          apiKeyConfigured: !!etherscanApiKey && etherscanApiKey !== "YourApiKeyHere",
          apiKeyPrefix: etherscanApiKey ? etherscanApiKey.substring(0, 8) + "..." : "Not set",
          lastError: lastError,
          network: "Binance Smart Chain (BEP20)",
          usdtContract: usdtContract,
          manualVerificationUrl: `https://bscscan.com/token/${usdtContract}?a=${ourAddress}`,
          instructions: [
            "1. Visit the manual verification URL above",
            "2. Look for recent USDT transfers to your address",
            "3. Copy the transaction hash",
            "4. Use the Manual Verify tab to confirm payment",
          ],
        },
      })
    }

    let recentTransactions = []
    let matchingTransaction = null
    const apiStatus = {
      txStatus: txData.status || "0",
      txMessage: txData.message || "Unknown error",
      balanceStatus: "0",
      balanceMessage: "Not checked",
    }

    // Handle successful API response
    if (txData.status === "1" && txData.result && Array.isArray(txData.result)) {
      console.log(`✅ Found ${txData.result.length} USDT BEP20 transactions`)

      // Process all transactions
      recentTransactions = txData.result.slice(0, 10).map((tx: any) => {
        const txAmount = Number.parseInt(tx.value) / Math.pow(10, Number.parseInt(tx.tokenDecimal))
        const txTimestamp = new Date(Number.parseInt(tx.timeStamp) * 1000)
        const isRecent = Date.now() - txTimestamp.getTime() < 3600000 // Within last hour
        const isToOurAddress = tx.to.toLowerCase() === ourAddress.toLowerCase()

        // Check if this transaction matches our expected amount
        const amountTolerance = 0.001 // Allow small differences
        const isExpectedAmount = expectedAmount
          ? Math.abs(txAmount - Number.parseFloat(expectedAmount)) <= amountTolerance
          : true

        const txInfo = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: txAmount,
          timestamp: txTimestamp.toISOString(),
          confirmations: tx.confirmations,
          isRecent,
          isToOurAddress,
          isExpectedAmount,
        }

        // If this is a matching transaction, store it
        if (isToOurAddress && isRecent && isExpectedAmount && !matchingTransaction) {
          matchingTransaction = txInfo
          console.log("✅ Found matching transaction:", txInfo)
        }

        return txInfo
      })

      apiStatus.txMessage = "Transactions retrieved successfully"
    } else if (txData.status === "0") {
      console.log("⚠️ API returned status 0:", txData.message)
      apiStatus.txMessage = txData.message + (txData.result ? " - " + txData.result : "") || "No transactions found"
    }

    // Try to get balance if we have a working endpoint
    let balance = 0
    if (workingEndpoint && txData.status === "1") {
      const balanceUrl = workingEndpoint.replace("tokentx", "tokenbalance").split("&page=")[0] + "&tag=latest"

      try {
        const balanceResponse = await fetch(balanceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CryptoPaymentBot/1.0)",
            Accept: "application/json",
          },
        })

        if (balanceResponse.ok) {
          const balanceText = await balanceResponse.text()
          const balanceData = JSON.parse(balanceText)

          if (balanceData.status === "1") {
            const balanceWei = balanceData.result || "0"
            balance = Number.parseInt(balanceWei) / Math.pow(10, 18) // USDT BEP20 has 18 decimals
            console.log("✅ Current USDT BEP20 balance:", balance)
            apiStatus.balanceStatus = "1"
            apiStatus.balanceMessage = "Balance retrieved successfully"
          }
        }
      } catch (balanceError) {
        console.log("⚠️ Balance check failed:", balanceError)
        apiStatus.balanceStatus = "0"
        apiStatus.balanceMessage = "Balance check failed"
      }
    }

    return NextResponse.json({
      address: ourAddress,
      balance: balance,
      recentTransactions: recentTransactions,
      matchingTransaction: matchingTransaction,
      lastChecked: new Date().toISOString(),
      apiStatus: apiStatus,
      network: "bsc",
      workingEndpoint: workingEndpoint?.split("?")[0],
      debugInfo: {
        apiKeyConfigured: !!etherscanApiKey && etherscanApiKey !== "YourApiKeyHere",
        apiKeyPrefix: etherscanApiKey ? etherscanApiKey.substring(0, 8) + "..." : "Not set",
        workingEndpoint: workingEndpoint?.replace(etherscanApiKey || "", "***"),
        rawTxResponse: txData,
        network: "Binance Smart Chain (BEP20)",
        usdtContract: usdtContract,
        manualVerificationUrl: `https://bscscan.com/token/${usdtContract}?a=${ourAddress}`,
      },
    })
  } catch (error) {
    console.error("❌ Error checking address balance:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check balance",
        errorDetails: error instanceof Error ? error.stack : "No details available",
        address: "0xa85BAC140e091e5b74c235F666e8C9849a7BBA55",
        balance: 0,
        recentTransactions: [],
        lastChecked: new Date().toISOString(),
        apiStatus: {
          txStatus: "0",
          txMessage: "API request failed: " + (error instanceof Error ? error.message : "Unknown error"),
          balanceStatus: "0",
          balanceMessage: "Not checked due to error",
        },
        manualMode: true,
        debugInfo: {
          error: error instanceof Error ? error.message : "Unknown error",
          manualVerificationUrl: `https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955?a=0xa85BAC140e091e5b74c235F666e8C9849a7BBA55`,
          instructions: [
            "Network restrictions prevent automatic detection",
            "Use manual verification with transaction hash",
            "Check BSCScan directly for transactions",
          ],
        },
      },
      { status: 500 },
    )
  }
}
