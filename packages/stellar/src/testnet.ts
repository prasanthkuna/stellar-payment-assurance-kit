/** Live Stellar testnet payout — friendbot fund, submit, verify via Horizon. */

import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk"
import { bindEnvelope, verifyOperationFacts, type PaymentOperationFacts } from "./index.js"
import {
  HORIZON_TESTNET,
  factsFromObserved,
  observePaymentFromHorizon,
  toStellarAmount,
} from "./horizon.js"

export interface TestnetPayoutInput {
  intentId: string
  idempotencyKey: string
  amount: string
  horizonUrl?: string
  networkPassphrase?: string
}

export interface TestnetPayoutEvidence {
  network: "testnet"
  horizonUrl: string
  intentId: string
  idempotencyKey: string
  txHash: string
  sourceAccount: string
  destinationAccount: string
  expected: PaymentOperationFacts
  observed: PaymentOperationFacts
  settlementStatus: ReturnType<typeof verifyOperationFacts>
  ledgerUrl: string
  generatedAt: string
}

async function fundViaFriendbot(publicKey: string, horizonUrl: string): Promise<void> {
  const res = await fetch(`${horizonUrl}/friendbot?addr=${encodeURIComponent(publicKey)}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`friendbot fund failed: ${res.status} ${body}`)
  }
}

export async function submitTestnetPayout(
  input: TestnetPayoutInput,
): Promise<TestnetPayoutEvidence> {
  const horizonUrl = input.horizonUrl ?? HORIZON_TESTNET
  const networkPassphrase = input.networkPassphrase ?? Networks.TESTNET
  const server = new Horizon.Server(horizonUrl)

  const source = Keypair.random()
  const destination = Keypair.random()

  await fundViaFriendbot(source.publicKey(), horizonUrl)
  await fundViaFriendbot(destination.publicKey(), horizonUrl)

  const expected = bindEnvelope({
    intentId: input.intentId,
    idempotencyKey: input.idempotencyKey,
    expected: {
      sourceAccount: source.publicKey(),
      destinationAccount: destination.publicKey(),
      assetCode: "XLM",
      assetIssuer: "",
      amount: toStellarAmount(input.amount),
      memo: "",
    },
  })

  const sourceAccount = await server.loadAccount(source.publicKey())
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: "200",
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: expected.destinationAccount,
        asset: Asset.native(),
        amount: input.amount,
      }),
    )
    .addMemo(Memo.text(expected.memo))
    .setTimeout(30)
    .build()

  transaction.sign(source)
  const result = await server.submitTransaction(transaction)
  const txHash = result.hash

  const observedBundle = await observePaymentFromHorizon({ txHash, horizonUrl })
  if (!observedBundle) {
    throw new Error(`no payment operation found for tx ${txHash}`)
  }

  const observedFacts = factsFromObserved(observedBundle.observed)
  const settlementStatus = verifyOperationFacts({
    observed: observedBundle.observed,
    expected,
    ledgerConfirmed: observedBundle.tx.successful,
    requiredConfirmations: 1,
    confirmations: 1,
  })

  return {
    network: "testnet",
    horizonUrl,
    intentId: input.intentId,
    idempotencyKey: input.idempotencyKey,
    txHash,
    sourceAccount: source.publicKey(),
    destinationAccount: destination.publicKey(),
    expected,
    observed: observedFacts,
    settlementStatus,
    ledgerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
    generatedAt: new Date().toISOString(),
  }
}

export async function verifyTestnetTransaction(input: {
  txHash: string
  expected: PaymentOperationFacts
  horizonUrl?: string
}): Promise<{
  settlementStatus: ReturnType<typeof verifyOperationFacts>
  observed: PaymentOperationFacts
  txHash: string
}> {
  const bundle = await observePaymentFromHorizon({
    txHash: input.txHash,
    horizonUrl: input.horizonUrl,
  })
  if (!bundle) {
    throw new Error(`no payment in tx ${input.txHash}`)
  }
  const settlementStatus = verifyOperationFacts({
    observed: bundle.observed,
    expected: input.expected,
    ledgerConfirmed: bundle.tx.successful,
    requiredConfirmations: 1,
    confirmations: 1,
  })
  return {
    txHash: input.txHash,
    observed: factsFromObserved(bundle.observed),
    settlementStatus,
  }
}
