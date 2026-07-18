import { describe, expect, it } from "vitest"
import { bindEnvelope, verifyOperationFacts } from "./index.js"
import { observePaymentFromHorizon } from "./horizon.js"
import { submitTestnetPayout } from "./testnet.js"

const RUN_LIVE = process.env.TESTNET_INTEGRATION === "1"

describe.skipIf(!RUN_LIVE)("Stellar testnet integration (live Horizon)", () => {
  it("submits a memo-bound payment and verifies settlement facts", async () => {
    const evidence = await submitTestnetPayout({
      intentId: "pi-integration",
      idempotencyKey: `idem-${Date.now()}`,
      amount: "0.5",
    })
    expect(evidence.settlementStatus).toBe("CONFIRMED")
    expect(evidence.txHash).toMatch(/^[a-f0-9]{64}$/)
    expect(evidence.expected.memo).toContain("PI:pi-integration:")
    expect(evidence.observed.memo).toBe(evidence.expected.memo)
  }, 60_000)

  it("re-fetches an on-ledger tx and confirms operation facts", async () => {
    const evidence = await submitTestnetPayout({
      intentId: "pi-refetch",
      idempotencyKey: `idem-refetch-${Date.now()}`,
      amount: "0.25",
    })
    const bundle = await observePaymentFromHorizon({ txHash: evidence.txHash })
    expect(bundle).not.toBeNull()
    const status = verifyOperationFacts({
      observed: bundle!.observed,
      expected: evidence.expected,
      ledgerConfirmed: bundle!.tx.successful,
      requiredConfirmations: 1,
      confirmations: 1,
    })
    expect(status).toBe("CONFIRMED")
  }, 60_000)

  it("SPA-003 reconciliation on wrong amount from live horizon parse", async () => {
    const evidence = await submitTestnetPayout({
      intentId: "pi-wrong-amt",
      idempotencyKey: `idem-wrong-${Date.now()}`,
      amount: "0.1",
    })
    const bundle = await observePaymentFromHorizon({ txHash: evidence.txHash })
    const wrongExpected = bindEnvelope({
      intentId: "pi-wrong-amt",
      idempotencyKey: evidence.idempotencyKey,
      expected: {
        ...evidence.expected,
        amount: "999999999",
      },
    })
    const status = verifyOperationFacts({
      observed: bundle!.observed,
      expected: wrongExpected,
      ledgerConfirmed: true,
      requiredConfirmations: 1,
      confirmations: 1,
    })
    expect(status).toBe("RECONCILIATION_REQUIRED")
  }, 60_000)
})
