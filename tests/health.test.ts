import { describe, it, expect } from 'vitest'
import { buildApp } from '../server/src/index'

describe('GET /health', () => {
  it('returns ffmpeg status', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('ffmpeg')
    expect(body.ffmpeg).toBe(true)
    expect(body).toHaveProperty('version')
    expect(body.status).toBe('ok')
    await app.close()
  })
})
