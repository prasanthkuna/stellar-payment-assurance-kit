#!/usr/bin/env node
import { runAllProfiles } from "../packages/runner/src/index.js"

const evidence = runAllProfiles()
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), profiles: evidence }, null, 2))
