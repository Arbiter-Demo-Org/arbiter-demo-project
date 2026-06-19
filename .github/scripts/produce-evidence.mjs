#!/usr/bin/env node
// Self-contained evidence producer for arbiter-demo-project CI.
// No npm dependencies — uses only Node.js built-ins.
//
// canonicalizeJson is copied verbatim from control-plane/src/util/canonical.ts.
// The golden-vector conformance test in control-plane/tests/canonical-golden-vector.test.ts
// verifies byte-identical output. If canonical.ts changes, update this copy and re-run tests.
import { createPrivateKey, sign } from 'node:crypto'

const headSha = process.env.PR_HEAD_SHA
const keyPem = process.env.DEMO_PRIVATE_KEY_PEM
const issuerKeyId = process.env.ISSUER_KEY_ID
const repo = process.env.REPO // e.g. "Arbiter-Demo-Org/arbiter-demo-project"

if (!headSha || !keyPem || !issuerKeyId || !repo) {
  process.stderr.write(
    'Required env vars: PR_HEAD_SHA, DEMO_PRIVATE_KEY_PEM, ISSUER_KEY_ID, REPO\n',
  )
  process.exit(1)
}

// COPIED VERBATIM from control-plane/src/util/canonical.ts — do not modify independently.
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  const sorted = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key])
  }
  return sorted
}
function canonicalizeJson(obj) {
  return JSON.stringify(sortObjectKeys(obj))
}

const payload = {
  schema_id: 'evidence/test-report/v1',
  issuer_key_id: issuerKeyId,
  issued_at: new Date().toISOString(),
  subject: { repo, head_sha: headSha.toLowerCase() },
  predicate: { status: 'passed' },
}

const canonical = Buffer.from(canonicalizeJson(payload))
const privateKey = createPrivateKey({ key: keyPem, format: 'pem' })
const signature = sign(null, canonical, privateKey).toString('base64')

process.stdout.write(JSON.stringify({ payload, signature }) + '\n')
