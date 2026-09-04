import { FastifyInstance } from 'fastify'
import fs from 'fs/promises'

export default async function subRoutes(app: FastifyInstance) {
  app.get('/sub/:id/:lang.srt', async (req, reply) => {
    const { id, lang } = req.params as any
    try {
      const file = await fs.readFile(`./data/subs/${id}_${lang}.srt`, 'utf-8')
      reply.header('Content-Type', 'text/plain; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="${id}_${lang}.srt"`)
      return reply.send(file)
    } catch {
      return reply.code(404).send('Subtitle not found. Try extracting first via POST /api/subtitle')
    }
  })
}
