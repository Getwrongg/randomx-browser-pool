import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { mountAdmin } from './admin/routes.js'
import { onWsMessage } from './wsHandlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const app = express()
app.use(express.json())
app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: { policy: 'require-corp' }
}))

// Serve static admin portal
const publicDir = path.join(rootDir, 'public')
app.use(express.static(publicDir))

// REST APIs
mountAdmin(app)

// Redirect root to /admin
app.get('/', (_req, res) => res.redirect(302, '/admin'))
app.get('/admin', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'))
})

const server = app.listen(config.port, () => {
    console.log(`HTTP listening on http://localhost:${config.port}`)
})

// WebSocket server
const wss = new WebSocketServer({ server, path: config.wsPath })
wss.on('connection', (ws, req) => {
    console.log('WS client connected from', req.socket.remoteAddress)
    ws.on('message', (data) => onWsMessage(ws, data.toString()))
    ws.on('error', (err) => console.error('WS error:', err))
    ws.on('close', () => console.log('WS closed'))
})
console.log(`WebSocket at path ${config.wsPath}`)
