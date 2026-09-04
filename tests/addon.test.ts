import { describe, it, expect } from 'vitest'
import { decodeConfig, encodeConfig } from '../addon/src/config'
import { getManifest } from '../addon/src/manifest'

describe('addon config', () => {
  it('encodes and decodes', () => {
    const cfg = { targetLang: 'vi', openai: { baseUrl: 'http://x', apiKey: 'sk', model: 'm' } }
    const str = encodeConfig(cfg)
    expect(decodeConfig(str)?.targetLang).toBe('vi')
    expect(decodeConfig(str)?.openai.model).toBe('m')
  })
  it('returns null for invalid', () => {
    expect(decodeConfig('invalid!!!')).toBeNull()
    expect(decodeConfig(undefined)).toBeNull()
  })
  it('manifest configurable', () => {
    const m1 = getManifest()
    expect(m1.behaviorHints.configurationRequired).toBe(true)
    const cfgStr = encodeConfig({ targetLang: 'vi' })
    const m2 = getManifest(cfgStr)
    expect(m2.behaviorHints.configurationRequired).toBe(false)
  })
})
