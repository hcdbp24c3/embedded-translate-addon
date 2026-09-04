import fs from 'fs'
import path from 'path'

const memCache = new Map<string, { value: string, expires: number }>()

let redis: any = null
let sqlite: any = null

async function initRedis() {
  if (process.env.REDIS_URL && !redis) {
    try {
      const { default: Redis } = await import('ioredis')
      redis = new Redis(process.env.REDIS_URL)
      redis.on('error', () => { redis = null })
    } catch { redis = null }
  }
}
initRedis()

async function initSqlite() {
  if (!redis && !sqlite && !process.env.REDIS_URL) {
    try {
      const { default: Database } = await import('better-sqlite3')
      const dbPath = process.env.SQLITE_PATH || './data/cache.db'
      fs.mkdirSync(path.dirname(dbPath), { recursive: true })
      sqlite = new Database(dbPath)
      sqlite.exec(`CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expires INTEGER)`)
    } catch { sqlite = null }
  }
}

export async function getCache(key: string): Promise<string | null> {
  if (redis) {
    try { const v = await redis.get(key); if (v) return v } catch {}
  }
  if (sqlite) {
    try {
      const row = sqlite.prepare('SELECT value FROM cache WHERE key=? AND expires>?').get(key, Date.now())
      if (row?.value) return row.value
    } catch {}
  }
  const entry = memCache.get(key)
  if (entry && entry.expires > Date.now()) return entry.value
  if (entry) memCache.delete(key)
  return null
}

export async function setCache(key: string, value: string, ttlSec: number = 2592000) {
  const expires = Date.now() + ttlSec * 1000
  if (redis) {
    try { await redis.set(key, value, 'EX', ttlSec); return } catch {}
  }
  if (sqlite) {
    try { sqlite.prepare('INSERT OR REPLACE INTO cache VALUES (?,?,?)').run(key, value, expires); return } catch {}
  }
  memCache.set(key, { value, expires })
}

export function clearCache() { memCache.clear() }
