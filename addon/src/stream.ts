export async function handleStream(args: any) {
  const imdbId = (args.id || '').split(':')[0]
  if (!imdbId) return { streams: [] }

  const type = args.type || 'movie'
  const idPart = args.id
  const backend = process.env.BACKEND_URL || 'http://localhost:3000'

  try {
    const torrentioUrl = `https://torrentio.stremio.ru/stream/${type}/${idPart}.json`
    const res = await fetch(torrentioUrl, { signal: AbortSignal.timeout(8000) as any })
    if (!res.ok) return { streams: [] }
    const data = await res.json() as any
    const streams: any[] = (data.streams || []).slice(0, 20).map((s: any) => {
      // If stream already has http url, cache it for subtitle handler
      if (s.url && s.url.startsWith('http')) {
        fetch(`${backend}/api/stream-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imdbId, type, url: s.url, season: args.id.includes(':') ? parseInt(args.id.split(':')[1]) : undefined, episode: args.id.includes(':') ? parseInt(args.id.split(':')[2]) : undefined })
        }).catch(() => {})
      }
      return s
    })
    return { streams }
  } catch {
    return { streams: [] }
  }
}
