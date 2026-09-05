export async function resolveToDirectUrl(imdbId: string, type: string, season?: number, episode?: number): Promise<string | null> {
  try {
    const idPart = season !== undefined && episode !== undefined ? `${imdbId}:${season}:${episode}` : imdbId
    const url = `https://torrentio.stremio.ru/stream/${type}/${idPart}.json`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) as any })
    if (!res.ok) return null
    const data = await res.json() as any
    const streams: any[] = data.streams || []
    if (streams.length === 0) return null
    // Prefer http url (already debrid-cached)
    let candidate = streams.find((s:any) => s.url && s.url.startsWith('http'))
    if (candidate) return candidate.url
    // Fallback: try to find any stream with http in behaviorHints or url
    candidate = streams.find((s:any) => s.behaviorHints?.bingeGroup?.includes('http'))
    if (candidate?.url) return candidate.url
    // No http link found - need stream capture via our stream handler cache
    return null
  } catch { return null }
}

export function isDirectUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
