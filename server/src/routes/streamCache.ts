import { FastifyInstance } from 'fastify'
import { setStreamUrl } from '../cache/streamCache.js'

export default async function streamCacheRoutes(app: FastifyInstance) {
  app.post('/api/stream-cache', async (req, reply) => {
    const { imdbId, type, season, episode, url } = req.body as any
    if (!imdbId || !url) return reply.code(400).send({ error: 'missing imdbId or url' })
    const key = season !== undefined && episode !== undefined ? `${imdbId}:${season}:${episode}` : imdbId
    setStreamUrl(key, url)
    return { ok: true }
  })
  app.get('/api/stream-cache/:id', async (req, reply) => {
    const { getStreamUrl } = await import('../cache/streamCache.js')
    const { id } = req.params as any
    const url = getStreamUrl(id)
    if (!url) return reply.code(404).send({ error: 'not found' })
    return { url }
  })
}
