# Stellar Payment Assurance Kit

Payment reliability infrastructure **native to Stellar** — deterministic binding between payment intent, transaction envelope, ledger operations, and accounting outcome.

> **Grant:** Stellar Community Fund Build Award (draft — see `docs/APPLICATION.md`)

## Thesis

```text
payment intent → transaction envelope → operation facts → reconciliation outcome
```

Not "Railguard ported to Stellar." Built around Stellar accounts, memos, assets, and ledger finality.

## Failure profiles

| ID | Invariant |
|----|-----------|
| SPA-001 | Duplicate payout blocked by intent idempotency |
| SPA-002 | Envelope must match intent (destination, asset, amount, memo) |
| SPA-003 | Wrong operation facts → RECONCILIATION_REQUIRED |
| SPA-004 | Crash after submit keeps reservation frozen |
| SPA-005 | Reconciler commits only after ledger confirmation |

## Quick start

```bash
npm install
npm test
```

## Packages

| Package | Role |
|---------|---------|
| `@stellar-kit/core` | Intent lifecycle, settlement status |
| `@stellar-kit/stellar` | Operation fact verification, memo binding |

## Evidence output

```json
{
  "profile": "SPA-002",
  "result": "PASS",
  "invariant": "envelope must match payment intent",
  "evidence_hash": "..."
}
```

## License

Apache-2.0
