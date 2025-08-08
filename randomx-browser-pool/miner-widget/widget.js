
// Transparent, opt-in miner widget (toy mode). ES module.
export function initMinerWidget({ container, defaultUrl='ws://127.0.0.1:8080/ws' } = {}){
  if (!container) throw new Error('initMinerWidget: container is required')

  const root = document.createElement('div')
  root.className = 'mw'
  container.appendChild(root)

  // State
  const clientId = localStorage.getItem('mw_clientId') || crypto.randomUUID()
  localStorage.setItem('mw_clientId', clientId)

  let ws = null, jobId = null, running = false, connected = false
  let accepted = 0, rejected = 0, hashrate = 0
  let cpuPct = 50, threads = Math.max(1, Math.min(navigator.hardwareConcurrency||2, 4))
  let lowPriority = true, lastHsReport = 0
  let coordinatorUrl = defaultUrl

  // UI
  root.innerHTML = `
    <div class="hdr">
      <div class="brand"><div class="dot"></div><span>Web Miner</span></div>
      <div class="status"><span class="d bad" id="mw-dot"></span><span id="mw-status">Disconnected</span></div>
    </div>
    <div class="row">
      <div class="card" style="flex:2">
        <label>Coordinator URL
          <input id="mw-url" type="text" value="${coordinatorUrl}" placeholder="ws://127.0.0.1:8080/ws"/>
        </label>
        <div class="row" style="margin-top:8px;align-items:center">
          <label>CPU %: <span id="mw-cpu-label">${cpuPct}</span>
            <input id="mw-cpu" type="range" min="1" max="100" value="${cpuPct}"/>
          </label>
          <label>Threads
            <input id="mw-threads" type="number" min="1" max="${navigator.hardwareConcurrency||8}" value="${threads}"/>
          </label>
          <label style="display:flex;flex-direction:row;gap:6px;align-items:center;margin-top:20px">
            <input id="mw-low" type="checkbox" ${lowPriority?'checked':''}/> <span class="muted">Low priority</span>
          </label>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn" id="mw-start">Start</button>
          <button class="btn secondary" id="mw-stop">Stop</button>
          <span class="muted">SAB: ${typeof SharedArrayBuffer !== 'undefined' ? 'available' : 'not available'}</span>
        </div>
      </div>
      <div class="card">
        <div class="muted">Client ID</div><div><code id="mw-cid">${clientId}</code></div>
        <div class="muted" style="margin-top:6px">Job</div><div id="mw-job">-</div>
        <div class="muted" style="margin-top:6px">Last update</div><div id="mw-last">-</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="grid">
        <div class="stat"><div class="muted">Hashrate</div><div id="mw-hs" style="font-weight:700;font-size:20px">0.0 H/s</div></div>
        <div class="stat"><div class="muted">Accepted</div><div id="mw-acc" style="font-weight:700;font-size:20px">0</div></div>
        <div class="stat"><div class="muted">Rejected</div><div id="mw-rej" style="font-weight:700;font-size:20px">0</div></div>
        <div class="stat"><div class="muted">Threads</div><div id="mw-th" style="font-weight:700;font-size:20px">${threads}</div></div>
      </div>
    </div>
    <div class="modal" id="mw-consent">
      <div class="panel">
        <h3 style="margin:0 0 8px 0">Run the miner in your browser</h3>
        <p class="muted">This uses your CPU to perform toy proof‑of‑work. It is opt‑in and transparent. No mining happens until you accept and press Start.</p>
        <label style="display:flex;gap:8px;align-items:center;margin:10px 0">
          <input id="mw-agree" type="checkbox"/>
          <span>I understand and consent to CPU usage and network activity.</span>
        </label>
        <div class="actions">
          <button class="btn secondary" id="mw-cancel">Cancel</button>
          <button class="btn" id="mw-continue" disabled>Continue</button>
        </div>
      </div>
    </div>
  `

  const $ = (sel) => root.querySelector(sel)
  const elDot = $('#mw-dot'), elStatus = $('#mw-status'), elHS = $('#mw-hs')
  const elAcc = $('#mw-acc'), elRej = $('#mw-rej'), elTh = $('#mw-th')
  const elJob = $('#mw-job'), elLast = $('#mw-last')
  const elUrl = $('#mw-url'), elCpu = $('#mw-cpu'), elCpuLabel = $('#mw-cpu-label')
  const elThreads = $('#mw-threads'), elLow = $('#mw-low')
  const elStart = $('#mw-start'), elStop = $('#mw-stop')
  const consentModal = $('#mw-consent'), elAgree = $('#mw-agree')
  const btnCancel = $('#mw-cancel'), btnCont = $('#mw-continue')

  // Consent
  let consentGiven = false
  const storedConsent = localStorage.getItem('mw_consent') === 'yes'
  if (storedConsent) { consentModal.style.display = 'none'; consentGiven = true }
  elAgree.addEventListener('change', () => btnCont.disabled = !elAgree.checked)
  btnCancel.addEventListener('click', () => { consentModal.style.display='none'; consentGiven=false })
  btnCont.addEventListener('click', () => { consentGiven=true; localStorage.setItem('mw_consent','yes'); consentModal.style.display='none' })

  // Controls
  elCpu.addEventListener('input', () => { cpuPct = parseInt(elCpu.value); elCpuLabel.textContent = String(cpuPct) })
  elThreads.addEventListener('input', () => { threads = Math.max(1, Math.min(parseInt(elThreads.value||'1'), navigator.hardwareConcurrency||8)); elTh.textContent = String(threads) })
  elLow.addEventListener('change', () => { lowPriority = elLow.checked })
  elUrl.addEventListener('change', () => { coordinatorUrl = elUrl.value })

  elStart.addEventListener('click', () => { if (!consentGiven) { consentModal.style.display='flex'; return } start() })
  elStop.addEventListener('click', stop)

  function setConn(status){
    connected = status
    elDot.className = 'd ' + (connected ? (running ? 'ok':'warn') : 'bad')
    elStatus.textContent = connected ? (running ? 'Mining' : 'Connected') : 'Disconnected'
  }
  function fmtHs(x){ if (x>=1e6) return (x/1e6).toFixed(2)+' MH/s'; if (x>=1e3) return (x/1e3).toFixed(2)+' kH/s'; return x.toFixed(1)+' H/s' }

  function connect(){
    ws = new WebSocket(coordinatorUrl)
    ws.onopen = () => {
      setConn(true)
      ws.send(JSON.stringify({ type:'hello', clientId:clientId, version:'widget-0.1.0', ua:navigator.userAgent, threads, supportsSharedMemory: typeof SharedArrayBuffer!=='undefined' }))
      ws.send(JSON.stringify({ type:'wantJob', clientId: clientId }))
    }
    ws.onclose = () => setConn(false)
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'job') {
        jobId = msg.jobId; elJob.textContent = jobId
        runToyLoop(msg)
      } else if (msg.type === 'ackShare') {
        if (msg.status === 'accepted') accepted++; else rejected++
        elAcc.textContent = String(accepted); elRej.textContent = String(rejected)
      }
    }
  }

  function start(){
    if (running) return
    accepted = 0; rejected = 0; hashrate = 0; jobId = null; elJob.textContent='-'
    running = true; setConn(connected)
    connect()
  }
  function stop(){
    running = false; setConn(connected)
    if (ws){ try { ws.send(JSON.stringify({ type:'stop', clientId, jobId })); ws.close() } catch(e){} ws = null }
  }

  // Toy miner loop: iterates nonces, yields, heartbeats, occasional fake shares
  let hsTimer = null
  function runToyLoop(job){
    if (!running) return
    let nonce = job.startNonce, end = job.startNonce + job.nonceCount
    if (hsTimer) clearInterval(hsTimer)
    hsTimer = setInterval(() => {
      elHS.textContent = fmtHs(hashrate)
      elLast.textContent = new Date().toLocaleTimeString()
      const now = Date.now()
      if (ws && now - lastHsReport > 2000){
        ws.send(JSON.stringify({ type:'heartbeat', clientId, jobId, hashrate, cpuPct, threads, memMode: (typeof SharedArrayBuffer!=='undefined') ? 'SAB':'AB' }))
        lastHsReport = now
      }
    }, 1000)

    function step(){
      if (!running || !ws) return
      const slice = Math.max(50, Math.floor(1000 * (cpuPct/100)))
      let did = 0
      for (let i = 0; i < slice && nonce < end; i++, nonce++){ did++
        // fake hashing
        if (Math.random() < 0.00001){
          const rand = Math.random().toString(16).slice(2).padEnd(64,'0')
          const hashHex = rand.startsWith('0'.repeat(job.difficulty)) ? rand : '0'.repeat(job.difficulty) + rand.slice(job.difficulty)
          ws.postMessage ? null : null
          ws.send(JSON.stringify({ type:'share', clientId, jobId: job.jobId, nonce, hashHex, token: job.token }))
        }
      }
      hashrate = did // toy estimate
      if (nonce >= end){
        ws.send(JSON.stringify({ type:'wantJob', clientId, lastJobId: job.jobId }))
      } else {
        const sleepMs = Math.max(0, (100 - cpuPct) * 0.5)
        setTimeout(step, sleepMs)
      }
    }
    step()
  }
}
