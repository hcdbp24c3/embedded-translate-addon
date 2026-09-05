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

  // CORS early
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Headers', '*')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    if (req.method === 'OPTIONS') {
      reply.code(204).send()
      return
    }
  })

  await app.register(healthRoutes)
  await app.register(subtitleRoutes)
  await app.register(subRoutes)
  await app.register(configRoutes)
  await app.register(manifestRoutes)

  // Serve Web UI static
  const publicDir = path.resolve(__dirname, '../../server/public')
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    wildcard: false,
    index: false
  })

  app.get('/configure', async (req, reply) => {
    return reply.sendFile('index.html')
  })

  app.get('/', async (req, reply) => {
    return reply.redirect('/configure')
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
