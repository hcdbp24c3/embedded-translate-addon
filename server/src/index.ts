import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import healthRoutes from './routes/health.js'
import subtitleRoutes from './routes/subtitle.js'
import subRoutes from './routes/sub.js'
import configRoutes from './routes/config.js'
import manifestRoutes from './routes/manifest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function buildApp() {
  const app = Fastify({ logger: false })
  await app.register(healthRoutes)
  await app.register(subtitleRoutes)
  await app.register(subRoutes)
  await app.register(configRoutes)
  await app.register(manifestRoutes)

  // Serve Web UI static at /configure and /assets
  const publicDir = path.join(__dirname, '../../server/public')
  await app.register(fastifyStatic, { root: publicDir, prefix: '/', wildcard: false, decorateReply: false })

  app.get('/configure', async (req, reply) => {
    return reply.sendFile('index.html', publicDir)
  })

  // CORS for addon
  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Headers', '*')
    return payload
  })

  return app
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const app = await buildApp()
  const port = Number(process.env.PORT || 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server listening on http://0.0.0.0:${port}`)
}
