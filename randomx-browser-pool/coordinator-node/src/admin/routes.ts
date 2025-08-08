import type { Express } from 'express'
import { workers } from '../state.js'
import { config } from '../config.js'

export function mountAdmin(app: Express) {
  app.get('/api/workers', (_req, res) => {
    const all = [...workers.values()].map(w => ({
      id: w.id, ua: w.ua, threads: w.threads, sab: w.supportsSharedMemory,
      lastSeen: w.lastSeen, job: w.currentJobId || null,
      hashrate: w.hashrate1s || 0, accepted: w.accepted, rejected: w.rejected
    }))
    res.json(all)
  })

  app.get('/api/pool', (_req, res) => {
    const totalHs = [...workers.values()].reduce((a, w) => a + (w.hashrate1s || 0), 0)
    res.json({ totalHashrate: totalHs, workers: workers.size, difficulty: config.baseDifficulty })
  })

  app.post('/api/control', (req, res) => {
    const { setDifficulty } = req.body || {}
    if (typeof setDifficulty === 'number' && setDifficulty >= 1 && setDifficulty <= 64) {
      config.baseDifficulty = setDifficulty
    }
    res.json({ ok: true, difficulty: config.baseDifficulty })
  })

  app.get('/', (_req, res) => {
    res.type('html').send(`
      <html><head><title>Coordinator Admin</title>
      <style>body{font-family:system-ui,sans-serif;padding:1rem} table{border-collapse:collapse} td,th{border:1px solid #ddd;padding:4px 8px}</style>
      </head><body>
        <h1>Coordinator Admin</h1>
        <div id="root"></div>
        <script>
          async function load(){
            const [pool, workers] = await Promise.all([fetch('/api/pool').then(r=>r.json()), fetch('/api/workers').then(r=>r.json())])
            document.getElementById('root').innerHTML = \`
              <p>Total H/s: \${pool.totalHashrate.toFixed(1)} | Workers: \${pool.workers} | Difficulty: \${pool.difficulty}</p>
              <table><thead><tr><th>id</th><th>UA</th><th>threads</th><th>SAB</th><th>job</th><th>H/s</th><th>acc</th><th>rej</th><th>lastSeen</th></tr></thead>
              <tbody>\${
                workers.map(w => \`<tr><td>\${w.id}</td><td>\${w.ua.slice(0,40)}</td><td>\${w.threads}</td><td>\${w.sab}</td><td>\${w.job||'-'}</td><td>\${(w.hashrate||0).toFixed(1)}</td><td>\${w.accepted}</td><td>\${w.rejected}</td><td>\${new Date(w.lastSeen).toLocaleTimeString()}</td></tr>\`).join('')
              }</tbody></table>\`
          }
          load(); setInterval(load, 3000)
        </script>
      </body></html>
    `)
  })
}
