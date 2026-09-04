import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../server/src/extractor/ffprobe', () => ({
  probeSubtitles: vi.fn(async () => [{ index: 0, codec_name: 'subrip', codec_type: 'subtitle', language: 'eng' }])
}))
vi.mock('../server/src/extractor/ffmpeg', () => ({
  extractSrt: vi.fn(async () => `1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:06,000\nGood morning\n`),
  UnsupportedCodecError: class extends Error { code='UNSUPPORTED_CODEC' },
  NoSubtitleError: class extends Error { code='NO_TEXT_SUBTITLE' }
}))
vi.mock('../server/src/translator/openai-adapter', () => ({
  translateBatch: vi.fn(async (texts) => texts.map(() => "Xin chào"))
}))

import { buildApp } from '../server/src/index'
import { clearCache } from '../server/src/cache/index'

describe('POST /api/subtitle', () => {
  beforeEach(() => clearCache())
  it('returns srt url after translate', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/subtitle', payload: { imdbId: 'tt123', type: 'movie', targetLang: 'vi', sourceLang: 'en', openai: { baseUrl: 'http://mock', apiKey: 'sk-test', model: 'gpt-4o-mini' }, url: 'http://example.com/video.mkv' } })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.subtitles[0].url).toContain('/sub/tt123/vi.srt')
    expect(body.subtitles[0].lang).toBe('vi')
    await app.close()
  })
  it('returns 400 when missing params', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/subtitle', payload: { imdbId: 'tt123' } })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
  it('serves srt file after creation', async () => {
    const app = await buildApp()
    await app.inject({ method: 'POST', url: '/api/subtitle', payload: { imdbId: 'tt999', type: 'movie', targetLang: 'vi', openai: { baseUrl: 'http://mock', apiKey: 'sk-test', model: 'gpt-4o-mini' }, url: 'http://example.com/video.mkv' } })
    const res = await app.inject({ method: 'GET', url: '/sub/tt999/vi.srt' })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('00:00:01,000 --> 00:00:03,000')
    expect(res.payload).toContain('Xin chào')
    await app.close()
  })
  it('returns cached on second call', async () => {
    const app = await buildApp()
    const payload = { imdbId: 'tt777', type: 'movie', targetLang: 'vi', openai: { baseUrl: 'http://mock', apiKey: 'sk-test', model: 'gpt-4o-mini' }, url: 'http://example.com/video.mkv' }
    const r1 = await app.inject({ method: 'POST', url: '/api/subtitle', payload })
    const r2 = await app.inject({ method: 'POST', url: '/api/subtitle', payload })
    expect(JSON.parse(r2.payload).cached).toBe(true)
    await app.close()
  })
})
