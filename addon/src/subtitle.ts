import { decodeConfig } from './config.js'

export async function handleSubtitle(args: any) {
  const configStr = args.config || args.extra?.config || args.extra?.args?.config
  const config = decodeConfig(configStr)
  if (!config?.targetLang || !config?.openai?.apiKey) {
    return { subtitles: [] }
  }
  const imdbId = (args.id || '').split(':')[0]
  if (!imdbId) return { subtitles: [] }
  const backend = process.env.BACKEND_URL || 'http://localhost:3000'
  const payload: any = {
    imdbId,
    type: args.type || 'movie',
    targetLang: config.targetLang,
    sourceLang: config.sourceLang || 'auto',
    openai: config.openai,
    url: args.extra?.url || config.url
  }
  if (args.id.includes(':')) {
    const parts = args.id.split(':')
    payload.season = parseInt(parts[1])
    payload.episode = parseInt(parts[2])
  }
  try {
    const res = await fetch(`${backend}/api/subtitle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) return { subtitles: [] }
    const data = await res.json() as any
    return { subtitles: data.subtitles || [] }
  } catch {
    return { subtitles: [] }
  }
}
