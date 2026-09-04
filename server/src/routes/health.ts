import { FastifyInstance } from 'fastify'
import { execSync } from 'child_process'

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    let ffmpeg = false
    try { execSync('ffprobe -version', { stdio: 'ignore' }); ffmpeg = true } catch {}
    let redis = false
    if (process.env.REDIS_URL) redis = true
    return { status: 'ok', ffmpeg, redis, version: '0.1.0' }
  })
}
