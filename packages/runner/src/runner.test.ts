import { describe, expect, it } from "vitest"
import { runAllProfiles, runSpa004, runSpa005 } from "./index.js"

describe("SPA profile runner", () => {
  it("SPA-004 crash-after-submit freeze", () => {
    expect(runSpa004().result).toBe("PASS")
  })

  it("SPA-005 reconciler commit path", () => {
    expect(runSpa005().result).toBe("PASS")
  })

  it("full suite passes", () => {
    expect(runAllProfiles().every((entry) => entry.result === "PASS")).toBe(true)
    expect(runAllProfiles().length).toBe(5)
  })
})
