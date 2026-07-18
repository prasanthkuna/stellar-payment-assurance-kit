export type PaymentIntentStatus =
  | "prepared"
  | "executing"
  | "submitted"
  | "confirmed"
  | "reverted"
  | "unknown"
  | "reconciliation_required"
  | "failed"

export type SettlementStatus =
  | "pending"
  | "confirmed"
  | "reverted"
  | "reconciliation_required"

export type ReservationStatus = "reserved" | "committed" | "released" | "frozen"

export interface PaymentIntent {
  intentId: string
  idempotencyKey: string
  sourceAccount: string
  destinationAccount: string
  assetCode: string
  assetIssuer: string
  amount: string
  memo: string
  status: PaymentIntentStatus
  txHash?: string
  reservationStatus?: ReservationStatus
  settlementStatus?: SettlementStatus
}

export function buildIntentFingerprint(intent: PaymentIntent): string {
  return [
    intent.intentId,
    intent.idempotencyKey,
    intent.sourceAccount,
    intent.destinationAccount,
    intent.assetCode,
    intent.assetIssuer,
    intent.amount,
    intent.memo,
  ].join("|")
}

export function shouldFreezeReservation(txHash?: string): boolean {
  return Boolean(txHash)
}

export function shouldReleaseReservation(txHash?: string): boolean {
  return !txHash
}

export function isRetryBlocked(status: PaymentIntentStatus): boolean {
  return status === "submitted" || status === "unknown" || status === "reconciliation_required"
}

export function mapSettlementToIntentStatus(
  settlement: "CONFIRMED" | "REVERTED" | "RECONCILIATION_REQUIRED" | "PENDING",
): Pick<PaymentIntent, "status" | "settlementStatus" | "reservationStatus"> {
  switch (settlement) {
    case "CONFIRMED":
      return {
        status: "confirmed",
        settlementStatus: "confirmed",
        reservationStatus: "committed",
      }
    case "REVERTED":
      return {
        status: "reverted",
        settlementStatus: "reverted",
        reservationStatus: "released",
      }
    case "RECONCILIATION_REQUIRED":
      return {
        status: "reconciliation_required",
        settlementStatus: "reconciliation_required",
        reservationStatus: "frozen",
      }
    default:
      return { status: "submitted", settlementStatus: "pending", reservationStatus: "frozen" }
  }
}
