// NOTE: This is a simplified hashing loop scaffold.
// Integrate l1mey112/randomx.js for real RandomX hashing.
// Place dataset.wasm and vm.wasm in /public and import/init as per that repo.

import type { ServerJob } from '../types'

let cpuPct = 50
let yielding = false
let job: ServerJob | null = null
let hashesThisSecond = 0
let hsTimer: any
let threadIndex = 0

type StartMsg = { type: 'start', job: ServerJob, cpuPct: number, lowPriority: boolean, threadIndex: number }
type ThrottleMsg = { type: 'throttle', cpuPct: number }
type Msg = StartMsg | ThrottleMsg

self.onmessage = (ev: MessageEvent<Msg>) => {
  const m = ev.data
  if (m.type === 'start') {
    job = m.job
    cpuPct = m.cpuPct
    threadIndex = m.threadIndex
    startLoop()
  } else if (m.type === 'throttle') {
    cpuPct = m.cpuPct
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function startLoop() {
  if (!job) return
  if (hsTimer) clearInterval(hsTimer)
  hsTimer = setInterval(() => {
    // crude aggregate; real hashrate comes from actual hash calls per second
    ;(self as any).postMessage({ type: 'hashrate', hsTotal: hashesThisSecond })
    hashesThisSecond = 0
  }, 1000)

  // Fake workload here. Replace with RandomX hashing of nonces from startNonce..startNonce+nonceCount
  const end = job.startNonce + job.nonceCount
  for (let nonce = job.startNonce + threadIndex; nonce < end; nonce += 1) {
    // Simulate CPU work proportional to throttle
    // In real code, compute RandomX hash for (job.keyHex, nonce) and check difficulty target.
    busy(500 * (cpuPct / 100))
    hashesThisSecond++

    // Simulate a rare "share found"
    if (Math.random() < 0.00001) {
      const hashHex = Math.random().toString(16).slice(2).padEnd(64, '0')
      ;(self as any).postMessage({ type: 'share', share: { jobId: job.jobId, nonce, hashHex, token: job.token } })
    }

    // Yield to keep page responsive
    if (cpuPct < 100) await sleep((100 - cpuPct) * 0.5)
  }

  ;(self as any).postMessage({ type: 'doneRange' })
}

function busy(iterations: number) {
  // very rough CPU burn; replace with real hashing calls
  let x = 0
  for (let i = 0; i < iterations; i++) x += i ^ (i << 1)
  return x
}
