import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import { WebSocketServer } from 'ws'
import { config } from './config.js'
import { mountAdmin } from './admin/routes.js'
import { onWsMessage } from './wsHandlers.js'

const app = express()
app.use(express.json())
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' }
}))

mountAdmin(app)

const server = app.listen(config.port, () => {
  console.log(`HTTP listening on http://localhost:${config.port}`)
})

const wss = new WebSocketServer({ server, path: config.wsPath })
wss.on('connection', (ws) => {
  ws.on('message', (data) => onWsMessage(ws, data.toString()))
})
console.log(`WebSocket at path ${config.wsPath}`)
