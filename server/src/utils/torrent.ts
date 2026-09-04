export async function resolveToDirectUrl(imdbId: string, type: string, season?: number, episode?: number): Promise<string | null> {
  // Torrentio torrent list -> pick WEB-DL with text subs
  try {
    const idPart = season !== undefined && episode !== undefined ? `${imdbId}:${season}:${episode}` : imdbId
    const url = `https://torrentio.stremio.ru/stream/${type}/${idPart}.json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) as any })
    if (!res.ok) return null
    const data = await res.json() as any
    const streams: any[] = data.streams || []
    if (streams.length === 0) return null
    // Prefer WEB-DL/WEBRip, then any mkv
    let candidate = streams.find((s:any) => s.title?.includes('WEB-DL') || s.title?.includes('WEBRip'))
    if (!candidate) candidate = streams[0]
    // If candidate has direct http url (already resolved via debrid), return it
    // Torrentio streams have `url` or `infoHash` - for torrent we need to resolve via Torbox if token present
    if (candidate.url && candidate.url.startsWith('http')) return candidate.url
    // If we have TORBOX_TOKEN and infoHash, try to resolve
    if (process.env.TORBOX_TOKEN && candidate.infoHash) {
      // Torbox API: we need torrent_id + file_id, but torrentio doesn't give them
      // For MVP, return null and let caller handle
      return null
    }
    return candidate.url || null
  } catch { return null }
}

// Helper to detect if url is already direct http
export function isDirectUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
