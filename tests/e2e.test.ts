import { describe, it, expect } from 'vitest'
import { buildApp } from '../server/src/index'

describe('e2e', () => {
  it('health ok', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('ok')
    expect(body.ffmpeg).toBe(true)
    await app.close()
  })
  it('manifest returns', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/manifest.json' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.id).toBe('com.embedded-translate')
    expect(body.resources).toContain('subtitle')
    await app.close()
  })
  it('validate config with mock invalid', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/config/validate', payload: { baseUrl: 'http://invalid', apiKey: 'sk', model: 'x' } })
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('ok')
    await app.close()
  })
  it('subtitle missing url tries resolve and returns 404 when no http link', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/subtitle', payload: { imdbId: 'tt123', type: 'movie', targetLang: 'vi', openai: { baseUrl: 'http://mock', apiKey: 'sk', model: 'm' } } })
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload).error).toBe('NO_URL')
    await app.close()
  })
  it('manifest redirects to configure when config and html accept', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/manifest.json?config=eyJ0YXJnZXRMYW5nIjoidmkiLCJzb3VyY2VMYW5nIjoiYXV0byIsIm9wZW5haSI6eyJiYXNlVXJsIjoiaHR0cDovLzY2LjM2LjIyNi43MDo4MDA4L3YxIiwiYXBpS2V5IjoiMSIsIm1vZGVsIjoiUXdlbjMuNS05QiJ9fQ==', headers: { accept: 'text/html' } })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toContain('/configure?config=')
    await app.close()
  })
})
