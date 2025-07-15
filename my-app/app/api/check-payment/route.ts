import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const expectedAmount = searchParams.get("amount")

    if (!address || !expectedAmount) {
      return NextResponse.json(
        {
          error: "Missing parameters",
          confirmed: false,
          debugInfo: {
            error: "Missing address or amount parameter",
            address,
            expectedAmount,
          },
        },
        { status: 400 },
      )
    }

    const etherscanApiKey = process.env.BSCSCAN_API_KEY || "YMURRBM3WND7ZIJM8S1C5HEQXQK6W4S45B"
    const usdtContract = "0x55d398326f99059fF775485246999027B3197955"

    console.log("Checking payment for:", {
      address,
      expectedAmount,
      apiKey: etherscanApiKey.substring(0, 8) + "...",
      contract: usdtContract,
    })

    // Multiple API endpoints to try (Vercel-friendly)
    const apiEndpoints = [
      `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&page=1&offset=20&sort=desc&apikey=${etherscanApiKey}`,
      `https://api-bsc.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&page=1&offset=20&sort=desc&apikey=${etherscanApiKey}`,
    ]

    let data = null
    let workingEndpoint = null
    let lastError = null

    // Try each endpoint with timeout and proper headers
    for (const apiUrl of apiEndpoints) {
      try {
        console.log("Trying endpoint:", apiUrl.replace(etherscanApiKey, "***"))

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PaymentBot/1.0)",
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const responseText = await response.text()
          console.log("API Response Status:", response.status)
          console.log("API Response (first 200 chars):", responseText.substring(0, 200))

          try {
            data = JSON.parse(responseText)
            workingEndpoint = apiUrl
            console.log("✅ Successfully connected to:", new URL(apiUrl).hostname)
            break
          } catch (parseError) {
            console.error("JSON Parse Error:", parseError)
            lastError = `JSON parse error: ${parseError instanceof Error ? parseError.message : "Unknown"}`
            continue
          }
        } else {
          console.log("❌ HTTP error:", response.status, response.statusText)
          lastError = `HTTP ${response.status}: ${response.statusText}`
          continue
        }
      } catch (fetchError) {
        console.error("❌ Fetch error:", fetchError)
        lastError = fetchError instanceof Error ? fetchError.message : "Unknown fetch error"

        // Check for specific Vercel/serverless errors
        if (fetchError instanceof Error) {
          if (fetchError.message.includes("fetch failed") || fetchError.message.includes("ENOTFOUND")) {
            lastError = "Network connectivity issue in serverless environment"
          }
        }
        continue
      }
    }

    // If all API calls failed, return manual verification mode
    if (!data) {
      console.log("⚠️ All API endpoints failed, switching to manual verification mode")

      return NextResponse.json({
        confirmed: false,
        balance: 0,
        transactions: [],
        manualMode: true,
        apiStatus: {
          status: "0",
          message: `All API endpoints failed. Last error: ${lastError}`,
          result: "Manual verification required",
        },
        debugInfo: {
          error: "All API endpoints failed",
          lastError,
          testedEndpoints: apiEndpoints.map((url) => url.replace(etherscanApiKey, "***")),
          serverlessIssue: true,
          manualVerificationUrl: `https://bscscan.com/token/${usdtContract}?a=${address}`,
          instructions: [
            "1. Visit BSCScan manually using the link above",
            "2. Look for recent USDT transfers to your address",
            "3. Copy the transaction hash from BSCScan",
            "4. Use manual verification in the app",
          ],
          timestamp: new Date().toISOString(),
          environment: "Vercel Serverless",
        },
      })
    }

    console.log("Parsed API Response:", data)

    let confirmed = false
    let matchingTransactions = []
    let balance = 0

    const apiStatus = {
      status: data.status || "0",
      message: data.message || "Unknown error",
      result: data.result || null,
    }

    if (data.status === "1" && data.result && Array.isArray(data.result)) {
      console.log(`Found ${data.result.length} transactions`)

      // Process transactions
      const processedTxs = data.result.map((tx: any) => {
        const txAmount = Number.parseInt(tx.value) / Math.pow(10, Number.parseInt(tx.tokenDecimal))
        const txTime = new Date(Number.parseInt(tx.timeStamp) * 1000)
        const isRecent = Date.now() - txTime.getTime() < 3600000 // Within last hour
        const isToAddress = tx.to.toLowerCase() === address.toLowerCase()
        const isExpectedAmount = Math.abs(txAmount - Number.parseFloat(expectedAmount)) < 0.001

        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: txAmount,
          timestamp: txTime.toISOString(),
          confirmations: tx.confirmations,
          isRecent,
          isToAddress,
          isExpectedAmount,
          blockNumber: tx.blockNumber,
        }
      })

      // Find matching transactions
      matchingTransactions = processedTxs.filter((tx) => tx.isRecent && tx.isToAddress && tx.isExpectedAmount)

      if (matchingTransactions.length > 0) {
        confirmed = true
        console.log("✅ Found matching transaction:", matchingTransactions[0])
      }

      // Calculate balance (sum of all incoming transactions)
      balance = processedTxs.filter((tx) => tx.isToAddress).reduce((sum, tx) => sum + tx.value, 0)
    }

    // Try to get current token balance if we have a working endpoint
    if (workingEndpoint) {
      try {
        const balanceUrl = workingEndpoint.replace("tokentx", "tokenbalance").split("&page=")[0] + "&tag=latest"

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const balanceResponse = await fetch(balanceUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PaymentBot/1.0)",
            Accept: "application/json",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          if (balanceData.status === "1") {
            const balanceWei = balanceData.result || "0"
            balance = Number.parseInt(balanceWei) / Math.pow(10, 18) // USDT BEP20 has 18 decimals
            console.log("✅ Current balance:", balance, "USDT")
          }
        }
      } catch (balanceError) {
        console.error("Balance check error:", balanceError)
      }
    }

    const result = {
      confirmed,
      balance,
      transactions: data.result
        ? data.result.slice(0, 10).map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: Number.parseInt(tx.value) / Math.pow(10, Number.parseInt(tx.tokenDecimal)),
            timestamp: new Date(Number.parseInt(tx.timeStamp) * 1000).toISOString(),
            confirmations: tx.confirmations,
          }))
        : [],
      apiStatus,
      debugInfo: {
        workingEndpoint: workingEndpoint?.replace(etherscanApiKey, "***"),
        requestTime: new Date().toISOString(),
        matchingTransactions,
        expectedAmount: Number.parseFloat(expectedAmount),
        address,
        usdtContract,
        network: "BSC",
        environment: "Vercel Serverless",
        serverlessOptimized: true,
      },
    }

    console.log("Final result:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error checking payment:", error)

    // Enhanced error handling for serverless environment
    let errorMessage = "Unknown error"
    let isNetworkError = false

    if (error instanceof Error) {
      errorMessage = error.message
      isNetworkError =
        error.message.includes("fetch failed") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("timeout")
    }

    return NextResponse.json({
      confirmed: false,
      balance: 0,
      transactions: [],
      manualMode: isNetworkError,
      apiStatus: {
        status: "0",
        message: isNetworkError ? "Network connectivity issue in serverless environment" : "Request failed",
        result: errorMessage,
      },
      debugInfo: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString(),
        isNetworkError,
        environment: "Vercel Serverless",
        manualVerificationUrl: `https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955?a=0xa85BAC140e091e5b74c235F666e8C9849a7BBA55`,
        fallbackInstructions: [
          "Network restrictions in serverless environment detected",
          "Use manual verification with transaction hash",
          "Check BSCScan directly for recent transactions",
          "Copy transaction hash and verify manually",
        ],
      },
    })
  }
}
