import React, { useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { type ServerJob, type AckShare, type ServerConfig } from '../types'
import { makeWsClient } from '../wsClient'

const VERSION = '0.1.0'

export default function App() {
  const [clientId] = useState(() => localStorage.getItem('clientId') || uuidv4())
  const [connected, setConnected] = useState(false)
  const [consented, setConsented] = useState(false)
  const [running, setRunning] = useState(false)
  const [coordinatorUrl, setCoordinatorUrl] = useState<string>(location.origin.replace(/^http/, 'ws') + '/ws')
  const [cpuPct, setCpuPct] = useState(50)
  const [threads, setThreads] = useState(Math.max(1, Math.min(navigator.hardwareConcurrency || 2, 4)))
  const [lowPriority, setLowPriority] = useState(true)
  const [hashrate, setHashrate] = useState(0)
  const [accepted, setAccepted] = useState(0)
  const [rejected, setRejected] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const wsRef = useRef<ReturnType<typeof makeWsClient> | null>(null)

  useEffect(() => { localStorage.setItem('clientId', clientId) }, [clientId])

  const start = () => {
    if (!consented) return alert('Please consent first.')
    wsRef.current = makeWsClient({
      url: coordinatorUrl,
      clientId,
      version: VERSION,
      threads,
      cpuPct,
      lowPriority,
      onOpen: () => setConnected(true),
      onClose: () => { setConnected(false); setRunning(false) },
      onHashrate: (hs) => setHashrate(hs),
      onAccepted: () => setAccepted(a => a + 1),
      onRejected: () => setRejected(r => r + 1),
      onJob: (job) => setJobId(job.jobId),
      onStop: () => { setRunning(false); setJobId(null) }
    })
    wsRef.current.connect()
    setRunning(true)
  }

  const stop = () => {
    wsRef.current?.stop()
    setRunning(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '2rem auto', lineHeight: 1.5 }}>
      <h1>Browser RandomX Miner (Opt‑in)</h1>
      <details open>
        <summary><strong>Consent</strong></summary>
        <p>This page can mine a CPU‑heavy proof‑of‑work (RandomX) <em>only</em> with your permission. It uses Web Workers and optional SharedArrayBuffer. Data sent: a heartbeat, hashrate, and valid shares. No hidden mining.</p>
        <label>
          <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} /> I consent to CPU usage and network activity.
        </label>
      </details>

      <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <div>
          <label>Coordinator URL:&nbsp;
            <input style={{ width: 480 }} value={coordinatorUrl} onChange={e => setCoordinatorUrl(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <label>CPU %: {cpuPct}
            <input type="range" min={1} max={100} value={cpuPct} onChange={e => setCpuPct(parseInt(e.target.value))} />
          </label>
          <label>Threads:
            <input type="number" min={1} max={navigator.hardwareConcurrency || 8} value={threads}
              onChange={e => setThreads(parseInt(e.target.value || '1'))} />
          </label>
          <label>
            <input type="checkbox" checked={lowPriority} onChange={e => setLowPriority(e.target.checked)} /> Low priority
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          {!running ? <button onClick={start} disabled={!consented}>Start</button> : <button onClick={stop}>Stop</button>}
          <span style={{ marginLeft: 12 }}>Status: {connected ? 'connected' : 'disconnected'} / {running ? 'mining' : 'idle'}</span>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h3>Stats</h3>
        <div>Client ID: <code>{clientId}</code></div>
        <div>Job: {jobId || '-'}</div>
        <div>Hashrate (est): {hashrate.toFixed(1)} H/s</div>
        <div>Accepted: {accepted} | Rejected: {rejected}</div>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary><strong>Notes on performance</strong></summary>
        <ul>
          <li>For best performance, your browser must allow SharedArrayBuffer (served with COOP/COEP headers).</li>
          <li>If SharedArrayBuffer is unavailable, the miner falls back to ArrayBuffer but will be slower.</li>
        </ul>
      </details>
    </div>
  )
}
