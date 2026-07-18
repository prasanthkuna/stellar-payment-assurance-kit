#!/usr/bin/env npx tsx
/**
 * Live Stellar testnet evidence — funds via friendbot, submits payment, verifies on Horizon.
 *
 * Usage:
 *   npm run testnet-evidence              # submit new testnet payout
 *   STELLAR_TX_HASH=abc npm run testnet-verify  # verify existing tx (read-only)
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { runAllProfiles } from "../packages/runner/src/index.js"
import { submitTestnetPayout, verifyTestnetTransaction } from "../packages/stellar/src/testnet.js"
import { bindEnvelope } from "../packages/stellar/src/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const evidenceDir = join(__dirname, "..", "evidence")

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "submit"
  const unitProfiles = runAllProfiles()

  mkdirSync(evidenceDir, { recursive: true })

  if (mode === "verify" && process.env.STELLAR_TX_HASH) {
    const expected = bindEnvelope({
      intentId: process.env.STELLAR_INTENT_ID ?? "pi-testnet",
      idempotencyKey: process.env.STELLAR_IDEM_KEY ?? "idem-testnet",
      expected: {
        sourceAccount: process.env.STELLAR_SOURCE ?? "",
        destinationAccount: process.env.STELLAR_DEST ?? "",
        assetCode: "XLM",
        assetIssuer: "",
        amount: process.env.STELLAR_AMOUNT_STROOPS ?? "10000000",
        memo: "",
      },
    })
    const verified = await verifyTestnetTransaction({
      txHash: process.env.STELLAR_TX_HASH,
      expected,
    })
    const bundle = {
      generatedAt: new Date().toISOString(),
      mode: "verify",
      unitProfiles,
      live: verified,
    }
    const outPath = join(evidenceDir, "testnet-verify.json")
    writeFileSync(outPath, JSON.stringify(bundle, null, 2))
    console.log(JSON.stringify(bundle, null, 2))
    if (verified.settlementStatus !== "CONFIRMED") {
      process.exit(1)
    }
    return
  }

  const live = await submitTestnetPayout({
    intentId: "pi-testnet-evidence",
    idempotencyKey: `idem-${Date.now()}`,
    amount: "1",
  })

  const bundle = {
    generatedAt: new Date().toISOString(),
    mode: "submit",
    unitProfiles,
    live,
    ok: live.settlementStatus === "CONFIRMED",
  }

  const outPath = join(evidenceDir, "testnet-live.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2))
  console.log(JSON.stringify(bundle, null, 2))

  if (!bundle.ok) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
