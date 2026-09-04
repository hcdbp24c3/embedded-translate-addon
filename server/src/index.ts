import Fastify from 'fastify'
import healthRoutes from './routes/health.js'

export async function buildApp() {
  const app = Fastify({ logger: false })
  await app.register(healthRoutes)
  return app
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const app = await buildApp()
  const port = Number(process.env.PORT || 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server listening on http://0.0.0.0:${port}`)
}
