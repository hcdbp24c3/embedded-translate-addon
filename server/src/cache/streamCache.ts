const streamCache = new Map<string, { url: string, ts: number }>()

const TTL = 30 * 60 * 1000 // 30 minutes

export function setStreamUrl(key: string, url: string) {
  streamCache.set(key, { url, ts: Date.now() })
  // also store with imdbId only for fallback
  streamCache.set(key.split(':')[0], { url, ts: Date.now() })
}

export function getStreamUrl(key: string): string | null {
  const entry = streamCache.get(key)
  if (entry && Date.now() - entry.ts < TTL) return entry.url
  if (entry) streamCache.delete(key)
  // fallback to imdbId only
  const base = key.split(':')[0]
  if (base !== key) {
    const baseEntry = streamCache.get(base)
    if (baseEntry && Date.now() - baseEntry.ts < TTL) return baseEntry.url
  }
  return null
}

export function clearStreamCache() { streamCache.clear() }
