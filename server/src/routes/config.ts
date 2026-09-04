import { FastifyInstance } from 'fastify'
import { translateBatch } from '../translator/openai-adapter.js'

export default async function configRoutes(app: FastifyInstance) {
  app.post('/api/config/validate', async (req, reply) => {
    const { baseUrl, apiKey, model } = req.body as any
    if (!baseUrl || !apiKey || !model) return reply.code(400).send({ ok: false, error: 'Missing baseUrl, apiKey, model' })
    try {
      const start = Date.now()
      const out = await translateBatch(['Hello world', 'Good morning'], 'vi', 'en', { baseUrl, apiKey, model })
      return { ok: true, latency: Date.now() - start, sample: out }
    } catch (e:any) {
      return { ok: false, error: e.message }
    }
  })
}
