import type { Express } from 'express'
import { workers } from '../state.js'
import { config } from '../config.js'

export function mountAdmin(app: Express) {
    app.get('/api/workers', (_req, res) => {
        const all = [...workers.values()].map(w => ({
            id: w.id,
            ua: w.ua,
            threads: w.threads,
            sab: w.supportsSharedMemory,
            lastSeen: w.lastSeen,
            job: w.currentJobId || null,
            hashrate: w.hashrate1s || 0,
            accepted: w.accepted,
            rejected: w.rejected
        }))
        res.json(all)
    })

    app.get('/api/pool', (_req, res) => {
        const totalHs = [...workers.values()].reduce((a, w) => a + (w.hashrate1s || 0), 0)
        res.json({
            totalHashrate: totalHs,
            workers: workers.size,
            difficulty: config.baseDifficulty
        })
    })

    app.post('/api/control', (req, res) => {
        const { setDifficulty } = req.body || {}
        if (typeof setDifficulty === 'number' && setDifficulty >= 1 && setDifficulty <= 64) {
            config.baseDifficulty = setDifficulty
        }
        res.json({ ok: true, difficulty: config.baseDifficulty })
    })
}
