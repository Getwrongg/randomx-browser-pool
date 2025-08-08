import React, { useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { makeWsClient } from './wsClient'
import type { ServerJob } from './types'

const VERSION = '0.3.0'

function fmtHs(x: number){ if (x>=1e6) return (x/1e6).toFixed(2)+' MH/s'; if (x>=1e3) return (x/1e3).toFixed(2)+' kH/s'; return x.toFixed(1)+' H/s' }

export default function App(){
  const [clientId] = useState(() => localStorage.getItem('clientId') || uuidv4())
  useEffect(()=>localStorage.setItem('clientId', clientId),[clientId])
  const defaultWs = useMemo(()=> location.origin.replace(/^http/,'ws') + '/ws', [])
  const [coordinatorUrl, setCoordinatorUrl] = useState(defaultWs)
  const [consent, setConsent] = useState(false)
  const [connected, setConnected] = useState(false)
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string|null>(null)
  const [threads, setThreads] = useState(Math.max(1, Math.min(navigator.hardwareConcurrency||2, 4)))
  const [cpuPct, setCpuPct] = useState(50)
  const [lowPriority, setLowPriority] = useState(true)
  const [hashrate, setHashrate] = useState(0)
  const [accepted, setAccepted] = useState(0)
  const [rejected, setRejected] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const wsRef = useRef<ReturnType<typeof makeWsClient> | null>(null)

  function start(){
    if (!consent) { alert('Please consent first.'); return }
    wsRef.current?.stop()
    setAccepted(0); setRejected(0); setJobId(null)
    wsRef.current = makeWsClient({
      url: coordinatorUrl,
      clientId,
      version: VERSION,
      threads,
      cpuPct,
      lowPriority,
      onOpen: () => setConnected(true),
      onClose: () => { setConnected(false); setRunning(false) },
      onHashrate: (hs) => { setHashrate(hs); setLastUpdate(Date.now()) },
      onAccepted: () => setAccepted(a=>a+1),
      onRejected: () => setRejected(r=>r+1),
      onJob: (job: ServerJob) => setJobId(job.jobId),
      onStop: () => { setRunning(false); setJobId(null) }
    })
    wsRef.current.connect()
    setRunning(true)
  }
  function stop(){ wsRef.current?.stop(); setRunning(false) }
  const statusColour = connected ? (running ? 'ok' : 'warn') : 'bad'

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="dot"></div>
          <span>Web Miner</span>
          <span className="badge">v{VERSION}</span>
        </div>
        <div className="status"><span className={`dot-sm ${statusColour}`}></span><span>{connected ? (running?'Mining':'Connected'):'Disconnected'}</span></div>
      </div>

      {!consent && (
        <div className="modal">
          <div className="panel">
            <h2>Run the miner in your browser</h2>
            <p>This will use your CPU to attempt proof-of-work. It is strictly opt-in and transparent. The page sends heartbeats, hashrate, and valid shares to the coordinator you choose.</p>
            <div className="agree">
              <input id="agree" type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
              <label htmlFor="agree">I understand and consent to CPU usage and network activity.</label>
            </div>
            <div className="actions">
              <button className="btn secondary" onClick={()=>window.open('about:blank','_self')}>Cancel</button>
              <button className="btn" onClick={()=>setConsent(true)}>Continue</button>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="card controls" style={{flex:2}}>
          <h3>Coordinator</h3>
          <label>URL
            <input type="text" value={coordinatorUrl} onChange={e=>setCoordinatorUrl(e.target.value)} placeholder="ws://127.0.0.1:8080/ws"/>
          </label>
          <div className="row" style={{marginTop:10, alignItems:'center'}}>
            <label>CPU %: {cpuPct}
              <input type="range" min={1} max={100} value={cpuPct} onChange={e=>setCpuPct(parseInt(e.target.value))}/>
            </label>
            <label>Threads
              <input type="number" min={1} max={navigator.hardwareConcurrency||8} value={threads} onChange={e=>setThreads(Math.max(1, Number(e.target.value||1)))} />
            </label>
            <label className="switch">
              <input type="checkbox" checked={lowPriority} onChange={e=>setLowPriority(e.target.checked)} />
              <span>Low priority</span>
            </label>
          </div>
          <div className="row" style={{marginTop:10}}>
            {!running ? <button className="btn" onClick={start} disabled={!consent}>Start</button>
                      : <button className="btn secondary" onClick={stop}>Stop</button>}
            <span className="badge">SAB: {typeof SharedArrayBuffer !== 'undefined' ? 'available':'not available'}</span>
          </div>
        </div>

        <div className="card" style={{flex:1}}>
          <h3>Session</h3>
          <div className="kv">
            <div>Client ID</div><div><code>{clientId}</code></div>
            <div>Job</div><div>{jobId || '-'}</div>
            <div>Last update</div><div>{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '-'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3>Live Stats</h3>
        <div className="stat-grid">
          <div className="stat"><div className="label">Hashrate</div><div className="value">{fmtHs(hashrate)}</div></div>
          <div className="stat"><div className="label">Accepted</div><div className="value">{accepted}</div></div>
          <div className="stat"><div className="label">Rejected</div><div className="value">{rejected}</div></div>
          <div className="stat"><div className="label">Threads</div><div className="value">{threads}</div></div>
        </div>
      </div>
    </div>
  )
}
