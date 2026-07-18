/** Stellar-native operation fact verification (no RPC in core path). */

export type SettlementVerificationStatus =
  | "CONFIRMED"
  | "REVERTED"
  | "RECONCILIATION_REQUIRED"
  | "PENDING"

export interface PaymentOperationFacts {
  sourceAccount: string
  destinationAccount: string
  assetCode: string
  assetIssuer: string
  amount: string
  memo: string
}

export interface ObservedPaymentOperation {
  sourceAccount: string
  destinationAccount: string
  assetCode: string
  assetIssuer: string
  amount: string
  memo?: string
  successful: boolean
}

export interface EnvelopeBinding {
  intentId: string
  idempotencyKey: string
  expected: PaymentOperationFacts
}

export function buildMemoReference(intentId: string, idempotencyKey: string): string {
  return `PI:${intentId}:${idempotencyKey}`.slice(0, 28)
}

export function operationMatchesExpected(
  observed: ObservedPaymentOperation,
  expected: PaymentOperationFacts,
): boolean {
  return (
    observed.sourceAccount === expected.sourceAccount &&
    observed.destinationAccount === expected.destinationAccount &&
    observed.assetCode === expected.assetCode &&
    observed.assetIssuer === expected.assetIssuer &&
    observed.amount === expected.amount &&
    (observed.memo ?? "") === expected.memo
  )
}

export function verifyOperationFacts(input: {
  observed: ObservedPaymentOperation
  expected: PaymentOperationFacts
  ledgerConfirmed: boolean
  requiredConfirmations: number
  confirmations: number
}): SettlementVerificationStatus {
  if (!input.observed.successful) return "REVERTED"
  if (input.confirmations < input.requiredConfirmations) return "PENDING"
  if (!operationMatchesExpected(input.observed, input.expected)) {
    return "RECONCILIATION_REQUIRED"
  }
  return input.ledgerConfirmed ? "CONFIRMED" : "PENDING"
}

export function bindEnvelope(binding: EnvelopeBinding): PaymentOperationFacts {
  return {
    ...binding.expected,
    memo: buildMemoReference(binding.intentId, binding.idempotencyKey),
  }
}

/** In-memory duplicate submit guard for SPA-001. */
export class PayoutIntentRegistry {
  private readonly claimed = new Set<string>()

  claim(intentId: string, idempotencyKey: string): boolean {
    const key = `${intentId}:${idempotencyKey}`
    if (this.claimed.has(key)) return false
    this.claimed.add(key)
    return true
  }

  has(intentId: string, idempotencyKey: string): boolean {
    return this.claimed.has(`${intentId}:${idempotencyKey}`)
  }
}
