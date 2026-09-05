export async function resolveToDirectUrl(imdbId: string, type: string, season?: number, episode?: number, torboxToken?: string): Promise<string | null> {
  try {
    const idPart = season !== undefined && episode !== undefined ? `${imdbId}:${season}:${episode}` : imdbId
    const url = `https://torrentio.stremio.ru/stream/${type}/${idPart}.json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) as any })
    if (!res.ok) return null
    const data = await res.json() as any
    const streams: any[] = data.streams || []
    if (streams.length === 0) return null
    // Prefer streams that already have http url (cached debrid)
    let candidate = streams.find((s:any) => s.url && s.url.startsWith('http'))
    if (!candidate) candidate = streams.find((s:any) => s.title?.includes('WEB-DL') || s.title?.includes('WEBRip') || s.title?.includes('BluRay'))
    if (!candidate) candidate = streams[0]
    if (candidate?.url && candidate.url.startsWith('http')) return candidate.url
    // If candidate has infoHash and we have torboxToken, try to resolve via Torbox
    // Torbox resolve needs torrent_id/file_id, not just infoHash, so we try alternative: use StremThru-like direct link if available
    // For now, if torboxToken provided, try to use Torbox API to create torrent from magnet and get link (simplified)
    if (candidate?.infoHash && torboxToken) {
      // Try to use torbox API to get instant link - this is simplified, real flow needs creating torrent first
      // For subtitle extraction fallback, we return null and let caller know to try next stream
      // Try next http candidate
      const httpCandidate = streams.find((s:any) => s.url?.startsWith('http'))
      if (httpCandidate) return httpCandidate.url
    }
    return candidate?.url || null
  } catch { return null }
}

export async function resolveViaTorboxMagnet(magnet: string, torboxToken: string, fileIndex: number = 0): Promise<string | null> {
  try {
    // Create torrent on Torbox then request dl link - simplified for future use
    // This is placeholder for full OAuth flow; not used in MVP unless we have file_id
    return null
  } catch { return null }
}

export function isDirectUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
