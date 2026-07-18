import { describe, expect, it } from "vitest"
import { parseHorizonPayment, toStellarAmount } from "./horizon.js"

describe("Horizon payment parsing", () => {
  it("converts decimal XLM to stroops", () => {
    expect(toStellarAmount("1")).toBe("10000000")
    expect(toStellarAmount("0.5")).toBe("5000000")
    expect(toStellarAmount("1.25")).toBe("12500000")
  })

  it("parses native payment records with memo", () => {
    const observed = parseHorizonPayment(
      {
        type: "payment",
        transaction_hash: "abc",
        source_account: "GSOURCE",
        from: "GSOURCE",
        to: "GDEST",
        asset_type: "native",
        amount: "1.0000000",
        transaction_successful: true,
      },
      "PI:pi-1:idem-1",
    )
    expect(observed.assetCode).toBe("XLM")
    expect(observed.amount).toBe("10000000")
    expect(observed.memo).toBe("PI:pi-1:idem-1")
    expect(observed.destinationAccount).toBe("GDEST")
  })
})
