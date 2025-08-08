import type { WebSocket } from 'ws'

export type Worker = {
  id: string
  ws: WebSocket
  ua: string
  threads: number
  supportsSharedMemory: boolean
  lastSeen: number
  currentJobId?: string
  hashrate1s?: number
  accepted: number
  rejected: number
}

export const workers = new Map<string, Worker>()

let nextNonce = 0
export function allocateNonceRange(span: number) {
  const start = nextNonce
  nextNonce += span
  return { start, count: span }
}
