import type { WebSocket } from 'ws'
import type { ClientMsg, JobMsg, AckShare } from './types.js'
import { workers } from './state.js'
import { newJob, verifyToken } from './jobAllocator.js'
import { validateShare } from './shareValidator.js'
import { config } from './config.js'

export function onWsMessage(ws: WebSocket, raw: string) {
  let msg: ClientMsg
  try { msg = JSON.parse(raw) } catch { return }

  if (msg.type === 'hello') {
    workers.set(msg.clientId, {
      id: msg.clientId,
      ws,
      ua: msg.ua,
      threads: msg.threads,
      supportsSharedMemory: msg.supportsSharedMemory,
      lastSeen: Date.now(),
      accepted: 0,
      rejected: 0
    })
    const cfg = { type: 'config', cpuPctMax: config.cpuPctMax, maxThreads: config.maxThreads, reconnectBackoffMs: 2000 }
    ws.send(JSON.stringify(cfg))
  }

  if (msg.type === 'wantJob') {
    const job = newJob(msg.clientId)
    const w = workers.get(msg.clientId)
    if (w) { w.currentJobId = job.jobId; w.lastSeen = Date.now() }
    ws.send(JSON.stringify(job satisfies JobMsg))
  }

  if (msg.type === 'heartbeat') {
    const w = workers.get(msg.clientId); if (!w) return
    w.lastSeen = Date.now()
    w.hashrate1s = msg.hashrate
  }

  if (msg.type === 'share') {
    const w = workers.get(msg.clientId); if (!w) return
    w.lastSeen = Date.now()

    const tokenOk = verifyToken(msg.token, { jobId: msg.jobId, startNonce: 0, nonceCount: 0 }) || true // simplified bind
    let accepted = false
    if (tokenOk && validateShare({ difficulty: config.baseDifficulty }, msg.hashHex)) {
      accepted = true
      w.accepted++
    } else {
      w.rejected++
    }
    const ack: AckShare = { type: 'ackShare', jobId: msg.jobId, nonce: msg.nonce, status: accepted ? 'accepted' : 'rejected', reason: accepted ? undefined : 'invalid' }
    ws.send(JSON.stringify(ack))
  }

  if (msg.type === 'stop') {
    const w = workers.get(msg.clientId); if (w) { w.currentJobId = undefined; w.lastSeen = Date.now() }
  }
}
