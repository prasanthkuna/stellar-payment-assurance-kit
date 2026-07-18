import { describe, expect, it } from "vitest"
import {
  buildIntentFingerprint,
  isRetryBlocked,
  mapSettlementToIntentStatus,
  shouldFreezeReservation,
  shouldReleaseReservation,
} from "./index.js"

describe("payment intent lifecycle", () => {
  it("SPA-004 freezes reservation when tx hash exists", () => {
    expect(shouldFreezeReservation("abc123")).toBe(true)
    expect(shouldReleaseReservation("abc123")).toBe(false)
  })

  it("releases reservation only before broadcast", () => {
    expect(shouldReleaseReservation(undefined)).toBe(true)
  })

  it("blocks retry while reconciliation pending", () => {
    expect(isRetryBlocked("unknown")).toBe(true)
    expect(isRetryBlocked("reconciliation_required")).toBe(true)
    expect(isRetryBlocked("prepared")).toBe(false)
  })

  it("maps settlement outcomes to intent status", () => {
    expect(mapSettlementToIntentStatus("CONFIRMED").reservationStatus).toBe("committed")
    expect(mapSettlementToIntentStatus("RECONCILIATION_REQUIRED").status).toBe(
      "reconciliation_required",
    )
  })

  it("SPA-001 builds stable intent fingerprint", () => {
    const intent = {
      intentId: "pi-1",
      idempotencyKey: "idem-1",
      sourceAccount: "GSOURCE",
      destinationAccount: "GDEST",
      assetCode: "USDC",
      assetIssuer: "GISSUER",
      amount: "1000000",
      memo: "INV-42",
      status: "prepared" as const,
    }
    expect(buildIntentFingerprint(intent)).toContain("INV-42")
    expect(buildIntentFingerprint(intent)).toBe(buildIntentFingerprint(intent))
  })
})
