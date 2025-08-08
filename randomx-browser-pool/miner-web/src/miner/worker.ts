import type { ServerJob } from '../ui/types'

let cpuPct = 50
let job: ServerJob | null = null
let hashesThisSecond = 0
let hsTimer: any
let threadIndex = 0

type StartMsg = { type: 'start', job: ServerJob, cpuPct: number, lowPriority: boolean, threadIndex: number }
type ThrottleMsg = { type: 'throttle', cpuPct: number }
type Msg = StartMsg | ThrottleMsg

self.onmessage = (ev: MessageEvent<Msg>) => {
  const m = ev.data
  if (m.type === 'start') { job = m.job; cpuPct = m.cpuPct; threadIndex = m.threadIndex; startLoop() }
  else if (m.type === 'throttle') { cpuPct = m.cpuPct }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function startLoop() {
  if (!job) return
  if (hsTimer) clearInterval(hsTimer)
  hsTimer = setInterval(() => { ;(self as any).postMessage({ type: 'hashrate', hsTotal: hashesThisSecond }); hashesThisSecond = 0 }, 1000)

  const end = job.startNonce + job.nonceCount
  for (let nonce = job.startNonce + threadIndex; nonce < end; nonce += 1) {
    busy(500 * (cpuPct / 100)) // fake work
    hashesThisSecond++
    if (Math.random() < 0.00001) {
      const hashHex = Math.random().toString(16).slice(2).padEnd(64, '0')
      ;(self as any).postMessage({ type: 'share', share: { jobId: job.jobId, nonce, hashHex, token: job.token } })
    }
    if (cpuPct < 100) await sleep((100 - cpuPct) * 0.5)
  }
  ;(self as any).postMessage({ type: 'doneRange' })
}

function busy(iter: number){ let x=0; for(let i=0;i<iter;i++) x += i ^ (i<<1); return x }
