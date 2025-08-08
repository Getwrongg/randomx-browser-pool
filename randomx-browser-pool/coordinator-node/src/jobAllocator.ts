import crypto from 'node:crypto'
import { allocateNonceRange } from './state.js'
import { config } from './config.js'

export function newJob(forClientId: string) {
  const seed = crypto.randomBytes(32)
  const keyHex = seed.toString('hex').slice(0, 60) // <= 60B
  const { start, count } = allocateNonceRange(config.jobNonceSpan)
  const jobId = crypto.randomUUID()

  const token = signToken({ jobId, startNonce: start, nonceCount: count })

  return {
    type: 'job' as const,
    jobId,
    keyHex,
    startNonce: start,
    nonceCount: count,
    difficulty: config.baseDifficulty,
    token,
    timeLimitMs: config.jobTimeLimitMs
  }
}

function signToken(payload: { jobId: string, startNonce: number, nonceCount: number }) {
  const h = crypto.createHmac('sha256', config.hmacSecret)
  h.update(JSON.stringify(payload))
  return h.digest('hex')
}

export function verifyToken(token: string, payload: { jobId: string, startNonce: number, nonceCount: number }) {
  const t = signToken(payload)
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(t, 'hex'))
}
