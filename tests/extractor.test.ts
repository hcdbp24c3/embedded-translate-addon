import { describe, it, expect } from 'vitest'
import { parseSrt, rebuildSrt } from '../server/src/extractor/srt'
import { UnsupportedCodecError } from '../server/src/extractor/ffmpeg'

describe('srt parse/rebuild', () => {
  it('parses and rebuilds with same timestamps', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:06,000\nGood morning\n`
    const parsed = parseSrt(srt)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].text).toBe('Hello world')
    expect(parsed[0].start).toBe('00:00:01,000')
    const rebuilt = rebuildSrt(parsed.map(p => ({...p, text: 'Xin chào'})))
    expect(rebuilt).toContain('00:00:01,000 --> 00:00:03,000')
    expect(rebuilt).toContain('Xin chào')
  })
  it('handles empty', () => {
    expect(parseSrt('')).toEqual([])
    expect(rebuildSrt([])).toBe('')
  })
  it('handles multiline text', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello\nworld\n`
    const parsed = parseSrt(srt)
    expect(parsed[0].text).toBe('Hello\nworld')
  })
  it('UnsupportedCodecError has code', () => {
    const err = new UnsupportedCodecError('test')
    expect(err.code).toBe('UNSUPPORTED_CODEC')
  })
})
