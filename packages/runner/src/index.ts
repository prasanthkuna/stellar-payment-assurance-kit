import { createHash } from "node:crypto"
import {
  mapSettlementToIntentStatus,
  shouldFreezeReservation,
  shouldReleaseReservation,
} from "../../core/src/index.js"
import {
  PayoutIntentRegistry,
  bindEnvelope,
  verifyOperationFacts,
  type PaymentOperationFacts,
} from "../../stellar/src/index.js"

export interface ProfileEvidence {
  profile: string
  result: "PASS" | "FAIL"
  invariant: string
  evidence_hash: string
}

function evidence(profile: string, result: "PASS" | "FAIL", invariant: string): ProfileEvidence {
  const base = { profile, result, invariant }
  return { ...base, evidence_hash: createHash("sha256").update(JSON.stringify(base)).digest("hex") }
}

const baseExpected: PaymentOperationFacts = {
  sourceAccount: "GSOURCE111",
  destinationAccount: "GDEST2222",
  assetCode: "USDC",
  assetIssuer: "GISSUER33",
  amount: "1000000",
  memo: "",
}

export function runSpa001(): ProfileEvidence {
  const registry = new PayoutIntentRegistry()
  const first = registry.claim("pi-1", "idem-1")
  const second = registry.claim("pi-1", "idem-1")
  return evidence(
    "SPA-001",
    first && !second ? "PASS" : "FAIL",
    "duplicate payout blocked by intent idempotency",
  )
}

export function runSpa002(): ProfileEvidence {
  const facts = bindEnvelope({
    intentId: "pi-1",
    idempotencyKey: "idem-1",
    expected: baseExpected,
  })
  const status = verifyOperationFacts({
    observed: { ...facts, successful: true },
    expected: facts,
    ledgerConfirmed: true,
    requiredConfirmations: 1,
    confirmations: 1,
  })
  return evidence(
    "SPA-002",
    status === "CONFIRMED" ? "PASS" : "FAIL",
    "envelope must match payment intent",
  )
}

export function runSpa003(): ProfileEvidence {
  const facts = bindEnvelope({
    intentId: "pi-1",
    idempotencyKey: "idem-1",
    expected: baseExpected,
  })
  const status = verifyOperationFacts({
    observed: { ...facts, amount: "2000000", successful: true },
    expected: facts,
    ledgerConfirmed: true,
    requiredConfirmations: 1,
    confirmations: 1,
  })
  const mapped = mapSettlementToIntentStatus(status)
  return evidence(
    "SPA-003",
    mapped.status === "reconciliation_required" && mapped.reservationStatus === "frozen"
      ? "PASS"
      : "FAIL",
    "wrong operation facts require reconciliation",
  )
}

export function runSpa004(): ProfileEvidence {
  const txHash = "stellar-tx-hash-abc"
  const freeze = shouldFreezeReservation(txHash)
  const release = shouldReleaseReservation(txHash)
  return evidence(
    "SPA-004",
    freeze && !release ? "PASS" : "FAIL",
    "crash after submit keeps reservation frozen",
  )
}

export function runSpa005(): ProfileEvidence {
  const confirmed = mapSettlementToIntentStatus("CONFIRMED")
  const pass =
    confirmed.status === "confirmed" &&
    confirmed.settlementStatus === "confirmed" &&
    confirmed.reservationStatus === "committed"
  return evidence(
    "SPA-005",
    pass ? "PASS" : "FAIL",
    "reconciler commits reservation after ledger confirmation",
  )
}

export function runAllProfiles(): ProfileEvidence[] {
  return [runSpa001(), runSpa002(), runSpa003(), runSpa004(), runSpa005()]
}
