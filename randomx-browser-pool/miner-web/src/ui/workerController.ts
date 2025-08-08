import type { ServerJob } from './types'

let workers: Worker[] = []
let totalHs = 0
let reportTimer: any

type WorkerOpts = {
  job: ServerJob
  threads: number
  cpuPct: number
  lowPriority: boolean
  onHashrate: (hs: number) => void
  onShare: (share: { jobId: string, nonce: number, hashHex: string, token: string }) => void
  onDoneRange: () => void
}

export async function startWorkers(opts: WorkerOpts) {
  stopWorkers()
  totalHs = 0
  const scriptUrl = new URL('../miner/worker.ts', import.meta.url)
  for (let i = 0; i < opts.threads; i++) {
    const w = new Worker(scriptUrl, { type: 'module', name: `rx-worker-${i}` })
    w.onmessage = (ev) => {
      const m = ev.data
      if (m.type === 'hashrate') { totalHs = m.hsTotal }
      else if (m.type === 'share') { opts.onShare(m.share) }
      else if (m.type === 'doneRange') { opts.onDoneRange() }
    }
    w.postMessage({ type: 'start', job: opts.job, cpuPct: opts.cpuPct, lowPriority: opts.lowPriority, threadIndex: i })
    workers.push(w)
  }
  reportTimer = setInterval(() => opts.onHashrate(totalHs), 1000)
}

export function stopWorkers() { for (const w of workers) w.terminate(); workers = []; if (reportTimer) clearInterval(reportTimer) }
export function setThrottle(cpuPct: number) { for (const w of workers) w.postMessage({ type: 'throttle', cpuPct }) }
