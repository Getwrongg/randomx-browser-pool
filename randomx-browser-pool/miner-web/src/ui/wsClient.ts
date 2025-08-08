import type { ServerJob, AckShare, ServerConfig } from './types'
import { startWorkers, stopWorkers, setThrottle } from './workerController'

type Opts = {
  url: string
  clientId: string
  version: string
  threads: number
  cpuPct: number
  lowPriority: boolean
  onOpen: () => void
  onClose: () => void
  onHashrate: (hs: number) => void
  onAccepted: () => void
  onRejected: () => void
  onJob: (job: ServerJob) => void
  onStop: () => void
}

export function makeWsClient(opts: Opts) {
  let ws: WebSocket | null = null
  let jobId: string | null = null
  let lastHsReport = 0

  function connect() {
    ws = new WebSocket(opts.url)
    ws.onopen = () => {
      opts.onOpen()
      ws!.send(JSON.stringify({
        type: 'hello',
        clientId: opts.clientId,
        version: opts.version,
        ua: navigator.userAgent,
        threads: opts.threads,
        supportsSharedMemory: typeof SharedArrayBuffer !== 'undefined'
      }))
      ws!.send(JSON.stringify({ type: 'wantJob', clientId: opts.clientId }))
    }
    ws.onclose = () => { opts.onClose() }
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'config') {
        const cfg = msg as ServerConfig
        if (opts.cpuPct > cfg.cpuPctMax) setThrottle(cfg.cpuPctMax)
      } else if (msg.type === 'job') {
        const job = msg as ServerJob
        jobId = job.jobId
        opts.onJob(job)
        await startWorkers({
          job,
          threads: opts.threads,
          cpuPct: opts.cpuPct,
          lowPriority: opts.lowPriority,
          onHashrate: (hs) => {
            const now = Date.now()
            if (now - lastHsReport > 2000) {
              ws?.send(JSON.stringify({ type: 'heartbeat', clientId: opts.clientId, jobId, hashrate: hs, cpuPct: opts.cpuPct, threads: opts.threads, memMode: (typeof SharedArrayBuffer !== 'undefined') ? 'SAB':'AB' }))
              lastHsReport = now
            }
            opts.onHashrate(hs)
          },
          onShare: (share) => { ws?.send(JSON.stringify({ type: 'share', clientId: opts.clientId, ...share })) },
          onDoneRange: () => { ws?.send(JSON.stringify({ type: 'wantJob', clientId: opts.clientId, lastJobId: job.jobId })) }
        })
      } else if (msg.type === 'ackShare') {
        const ack = msg as AckShare
        if (ack.status === 'accepted') opts.onAccepted(); else opts.onRejected()
      } else if (msg.type === 'error') {
        console.error('server error', msg)
      }
    }
  }

  function stop() {
    stopWorkers()
    ws?.send(JSON.stringify({ type: 'stop', clientId: opts.clientId, jobId }))
    ws?.close()
    opts.onStop()
  }

  return { connect, stop }
}
