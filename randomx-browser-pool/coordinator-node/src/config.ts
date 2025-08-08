export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  wsPath: process.env.WS_PATH || '/ws',
  hmacSecret: process.env.HMAC_SECRET || 'change-me',
  cpuPctMax: parseInt(process.env.CPU_PCT_MAX || '90', 10),
  maxThreads: parseInt(process.env.MAX_THREADS || '8', 10),
  baseDifficulty: parseInt(process.env.DIFFICULTY || '5', 10), // toy difficulty
  jobNonceSpan: 50_000,
  jobTimeLimitMs: 60_000
}
