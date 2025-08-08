const $ = (q) => document.querySelector(q)
const el = (tag, props = {}) => Object.assign(document.createElement(tag), props)

const state = {
    timer: null,
    sort: 'hashrate',
    filter: ''
}

async function fetchPool() {
    const r = await fetch('/api/pool', { cache: 'no-store' })
    if (!r.ok) throw new Error('pool fetch failed')
    return r.json()
}

async function fetchWorkers() {
    const r = await fetch('/api/workers', { cache: 'no-store' })
    if (!r.ok) throw new Error('workers fetch failed')
    return r.json()
}

function fmtHs(x) {
    const n = Number(x) || 0
    if (n >= 1e6) return (n / 1e6).toFixed(2) + ' MH/s'
    if (n >= 1e3) return (n / 1e3).toFixed(2) + ' kH/s'
    return n.toFixed(1) + ' H/s'
}

function timeAgo(ms) {
    const s = Math.max(1, Math.round((Date.now() - ms) / 1000))
    if (s < 60) return s + 's ago'
    const m = Math.round(s / 60)
    if (m < 60) return m + 'm ago'
    const h = Math.round(m / 60)
    return h + 'h ago'
}

async function setDifficulty(d) {
    if (!Number.isFinite(d)) return
    await fetch('/api/control', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ setDifficulty: d })
    })
    await refresh()
}

function renderPool(pool) {
    $('#totalHashrate').textContent = fmtHs(pool.totalHashrate)
    $('#workerCount').textContent = pool.workers
    $('#difficulty').textContent = pool.difficulty
}

function renderWorkers(workers) {
    const tbody = $('#workersBody')
    tbody.innerHTML = ''
    const filter = state.filter.toLowerCase()

    // sort
    workers.sort((a, b) => {
        const k = state.sort
        if (k === 'hashrate') return (b.hashrate || 0) - (a.hashrate || 0)
        if (k === 'lastSeen') return (b.lastSeen || 0) - (a.lastSeen || 0)
        if (k === 'threads') return (b.threads || 0) - (a.threads || 0)
        if (k === 'accepted') return (b.accepted || 0) - (a.accepted || 0)
        if (k === 'rejected') return (b.rejected || 0) - (a.rejected || 0)
        return 0
    })

    for (const w of workers) {
        const match = `${w.id} ${w.ua}`.toLowerCase().includes(filter)
        if (!match) continue

        const tr = el('tr')
        const td = (...cells) => {
            const t = el('td'); cells.forEach(c => t.append(c)); tr.append(t)
        }

        td(el('code', { textContent: w.id }))
        td(el('span', { textContent: w.ua.slice(0, 70) }))
        td(el('span', { textContent: String(w.threads) }))
        td(el('span', { className: `badge ${w.sab ? 'ok' : 'no'}`, textContent: w.sab ? 'SAB' : 'No SAB' }))
        td(el('code', { textContent: w.job || '-' }))
        td(el('strong', { textContent: fmtHs(w.hashrate) }))
        td(el('span', { textContent: String(w.accepted) }))
        td(el('span', { textContent: String(w.rejected) }))
        td(el('span', { textContent: timeAgo(w.lastSeen) }))

        tbody.append(tr)
    }
}

async function refresh() {
    try {
        const [pool, workers] = await Promise.all([fetchPool(), fetchWorkers()])
        renderPool(pool)
        renderWorkers(workers)
        $('#lastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString()
    } catch (e) {
        console.error(e)
    }
}

function boot() {
    $('#refreshBtn').addEventListener('click', refresh)
    $('#setDifficultyBtn').addEventListener('click', () => {
        const val = Number($('#difficultyInput').value)
        if (Number.isFinite(val) && val >= 1 && val <= 64) {
            setDifficulty(val)
        }
    })
    $('#sortSelect').addEventListener('change', (e) => {
        state.sort = e.target.value
        refresh()
    })
    $('#filterText').addEventListener('input', (e) => {
        state.filter = e.target.value || ''
        refresh()
    })

    refresh()
    state.timer = setInterval(refresh, 3000)
}

document.addEventListener('DOMContentLoaded', boot)
