/** Horizon testnet/mainnet fetch + parse — real RPC, no mocks. */

import type { ObservedPaymentOperation, PaymentOperationFacts } from "./index.js"

export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org"
export const HORIZON_MAINNET = "https://horizon.stellar.org"

export interface HorizonPaymentRecord {
  type: string
  transaction_hash: string
  source_account: string
  from: string
  to: string
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  amount: string
  transaction_successful: boolean
}

export interface HorizonTransaction {
  hash: string
  successful: boolean
  memo?: string
  memo_type?: string
}

function assetFromHorizon(record: HorizonPaymentRecord): { code: string; issuer: string } {
  if (record.asset_type === "native") {
    return { code: "XLM", issuer: "" }
  }
  return {
    code: record.asset_code ?? "",
    issuer: record.asset_issuer ?? "",
  }
}

export function parseHorizonPayment(
  record: HorizonPaymentRecord,
  memo?: string,
): ObservedPaymentOperation {
  const asset = assetFromHorizon(record)
  return {
    sourceAccount: record.source_account,
    destinationAccount: record.to,
    assetCode: asset.code,
    assetIssuer: asset.issuer,
    amount: toStellarAmount(record.amount),
    memo: memo ?? "",
    successful: record.transaction_successful,
  }
}

/** Stellar amounts are decimal strings; verifier uses stroops for custom assets. */
export function toStellarAmount(decimal: string): string {
  const [whole, frac = ""] = decimal.split(".")
  const padded = `${frac}0000000`.slice(0, 7)
  return `${whole}${padded}`.replace(/^0+/, "") || "0"
}

export async function fetchHorizonTransaction(
  txHash: string,
  horizonUrl = HORIZON_TESTNET,
): Promise<HorizonTransaction> {
  const res = await fetch(`${horizonUrl}/transactions/${txHash}`)
  if (!res.ok) {
    throw new Error(`horizon transaction fetch failed: ${res.status} ${txHash}`)
  }
  return (await res.json()) as HorizonTransaction
}

export async function fetchHorizonPaymentOperations(
  txHash: string,
  horizonUrl = HORIZON_TESTNET,
): Promise<HorizonPaymentRecord[]> {
  const res = await fetch(`${horizonUrl}/transactions/${txHash}/operations`)
  if (!res.ok) {
    throw new Error(`horizon operations fetch failed: ${res.status} ${txHash}`)
  }
  const body = (await res.json()) as { _embedded: { records: HorizonPaymentRecord[] } }
  return body._embedded.records.filter((record) => record.type === "payment")
}

export async function observePaymentFromHorizon(input: {
  txHash: string
  horizonUrl?: string
}): Promise<{ observed: ObservedPaymentOperation; tx: HorizonTransaction } | null> {
  const horizonUrl = input.horizonUrl ?? HORIZON_TESTNET
  const [tx, payments] = await Promise.all([
    fetchHorizonTransaction(input.txHash, horizonUrl),
    fetchHorizonPaymentOperations(input.txHash, horizonUrl),
  ])
  const payment = payments[0]
  if (!payment) return null
  const memo = tx.memo_type === "text" ? (tx.memo ?? "") : ""
  return {
    tx,
    observed: parseHorizonPayment(payment, memo),
  }
}

export function factsFromObserved(observed: ObservedPaymentOperation): PaymentOperationFacts {
  return {
    sourceAccount: observed.sourceAccount,
    destinationAccount: observed.destinationAccount,
    assetCode: observed.assetCode,
    assetIssuer: observed.assetIssuer,
    amount: observed.amount,
    memo: observed.memo ?? "",
  }
}
