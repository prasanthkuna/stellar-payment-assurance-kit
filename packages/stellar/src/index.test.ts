import { describe, expect, it } from "vitest"
import {
  PayoutIntentRegistry,
  bindEnvelope,
  buildMemoReference,
  operationMatchesExpected,
  verifyOperationFacts,
} from "./index.js"

const expected = {
  sourceAccount: "GSOURCE111",
  destinationAccount: "GDEST2222",
  assetCode: "USDC",
  assetIssuer: "GISSUER33",
  amount: "1000000",
  memo: "PI:pi-1:idem-1",
}

describe("Stellar operation verification", () => {
  it("SPA-002 binds memo to intent identity", () => {
    const memo = buildMemoReference("pi-1", "idem-1")
    expect(memo.startsWith("PI:pi-1:idem-1")).toBe(true)
    const facts = bindEnvelope({ intentId: "pi-1", idempotencyKey: "idem-1", expected: { ...expected, memo: "" } })
    expect(facts.memo).toBe(memo)
  })

  it("SPA-003 requires reconciliation for wrong destination", () => {
    const status = verifyOperationFacts({
      observed: {
        ...expected,
        destinationAccount: "GWRONG444",
        successful: true,
        memo: expected.memo,
      },
      expected,
      ledgerConfirmed: true,
      requiredConfirmations: 1,
      confirmations: 1,
    })
    expect(status).toBe("RECONCILIATION_REQUIRED")
  })

  it("SPA-003 confirms matching operation facts", () => {
    const status = verifyOperationFacts({
      observed: { ...expected, successful: true, memo: expected.memo },
      expected,
      ledgerConfirmed: true,
      requiredConfirmations: 1,
      confirmations: 1,
    })
    expect(status).toBe("CONFIRMED")
  })

  it("SPA-001 blocks duplicate payout claims", () => {
    const registry = new PayoutIntentRegistry()
    expect(registry.claim("pi-1", "idem-1")).toBe(true)
    expect(registry.claim("pi-1", "idem-1")).toBe(false)
    expect(registry.has("pi-1", "idem-1")).toBe(true)
  })

  it("matches operation facts exactly", () => {
    expect(
      operationMatchesExpected(
        { ...expected, successful: true, memo: expected.memo },
        expected,
      ),
    ).toBe(true)
  })
})
