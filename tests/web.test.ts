import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig } from '../addon/src/config'

describe('web config encode', () => {
  it('generates install url', () => {
    const cfg = { targetLang: 'vi', openai: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' } }
    const b64 = encodeConfig(cfg)
    expect(b64).toBeTruthy()
    const decoded = decodeConfig(b64)
    expect(decoded.targetLang).toBe('vi')
    expect(`stremio://localhost/manifest.json?config=${b64}`).toContain('stremio://')
  })
})
