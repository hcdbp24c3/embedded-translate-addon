import { FastifyInstance } from 'fastify'
import { probeSubtitles } from '../extractor/ffprobe.js'
import { extractSrt, UnsupportedCodecError, NoSubtitleError } from '../extractor/ffmpeg.js'
import { parseSrt, rebuildSrt } from '../extractor/srt.js'
import { translateBatch } from '../translator/openai-adapter.js'
import { getCache, setCache } from '../cache/index.js'
import { getStreamUrl } from '../cache/streamCache.js'
import { cacheKey } from '../utils/hash.js'
import { resolveToDirectUrl } from '../utils/torrent.js'
import fs from 'fs/promises'

export default async function subtitleRoutes(app: FastifyInstance) {
  app.post('/api/subtitle', async (req, reply) => {
    const { imdbId, type, season, episode, targetLang, sourceLang = 'auto', openai, url, fileHash } = req.body as any
    if (!imdbId || !targetLang || !openai?.apiKey) {
      return reply.code(400).send({ error: 'MISSING_PARAMS', message: 'imdbId, targetLang, openai.apiKey required' })
    }

    // Auto-capture: try url -> streamCache -> torrentio http
    let directUrl: string | null = url || null
    if (!directUrl) {
      const key = season !== undefined && episode !== undefined ? `${imdbId}:${season}:${episode}` : imdbId
      directUrl = getStreamUrl(key)
    }
    if (!directUrl) {
      directUrl = await resolveToDirectUrl(imdbId, type || 'movie', season, episode)
      if (!directUrl) {
        return reply.code(404).send({ error: 'NO_URL', message: 'Không tìm thấy http link. Addon sẽ tự bắt stream khi bạn chọn stream từ addon này. Hãy chọn stream có chữ [Embedded-Translate] hoặc thử bản WEB-DL khác.' })
      }
    }

    const key = cacheKey(imdbId, targetLang, openai.model, fileHash)
    const cached = await getCache(key)
    if (cached) {
      return { subtitles: [{ id: `embedded-${targetLang}`, url: cached, lang: targetLang, source: 'embedded' }], cached: true }
    }
    try {
      const streams = await probeSubtitles(directUrl)
      const TEXT_CODECS = ['subrip','ass','ssa','mov_text','srt']
      const textStreams = streams.filter(s => TEXT_CODECS.includes(s.codec_name))
      if (streams.length > 0 && textStreams.length === 0) {
        return reply.code(400).send({ error: 'UNSUPPORTED_CODEC', message: `PGS bitmap không hỗ trợ. Found: ${streams.map(s=>s.codec_name).join(',')}. Hãy chọn bản WEB-DL.` })
      }
      if (textStreams.length === 0 && streams.length === 0) {
        return reply.code(404).send({ error: 'NO_TEXT_SUBTITLE', message: 'No subtitle streams found in file' })
      }
      const srtContent = await extractSrt(directUrl, 0)
      if (!srtContent.trim()) return reply.code(404).send({ error: 'NO_TEXT_SUBTITLE', message: 'Empty subtitle' })
      const parsed = parseSrt(srtContent)
      if (parsed.length === 0) return reply.code(404).send({ error: 'NO_TEXT_SUBTITLE', message: 'Failed to parse srt' })
      const texts = parsed.map(p => p.text)
      const srcLang = sourceLang === 'auto' ? (textStreams[0]?.language || 'en') : sourceLang
      let translated: string[]
      try {
        translated = await translateBatch(texts, targetLang, srcLang, openai)
      } catch (e:any) {
        return reply.code(502).send({ error: 'TRANSLATE_FAILED', message: e.message })
      }
      const rebuilt = rebuildSrt(parsed.map((p,i) => ({ ...p, text: translated[i] })))
      const filePath = `./data/subs/${imdbId}_${targetLang}.srt`
      await fs.mkdir('./data/subs', { recursive: true })
      await fs.writeFile(filePath, rebuilt, 'utf-8')
      const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`
      const publicUrl = `${baseUrl}/sub/${imdbId}/${targetLang}.srt`
      await setCache(key, publicUrl)
      return { subtitles: [{ id: `embedded-${targetLang}`, url: publicUrl, lang: targetLang, source: 'embedded' }] }
    } catch (e:any) {
      if (e instanceof UnsupportedCodecError) return reply.code(400).send({ error: 'UNSUPPORTED_CODEC', message: e.message })
      if (e instanceof NoSubtitleError) return reply.code(404).send({ error: 'NO_TEXT_SUBTITLE', message: e.message })
      if (e.code === 'UNSUPPORTED_CODEC') return reply.code(400).send({ error: 'UNSUPPORTED_CODEC', message: e.message })
      req.log.error(e)
      return reply.code(500).send({ error: 'EXTRACT_FAILED', message: e.message })
    }
  })
}
