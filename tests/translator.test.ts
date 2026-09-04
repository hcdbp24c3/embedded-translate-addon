import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn(async () => ({
  choices: [{ message: { content: JSON.stringify({ translations: ["Xin chào", "Chào buổi sáng"] }) } }]
}))

vi.mock('openai', () => {
  return { default: class MockOpenAI {
    chat = { completions: { create: mockCreate } }
    constructor(_opts:any) {}
  }}
})

import { translateBatch } from '../server/src/translator/openai-adapter'

describe('translateBatch', () => {
  beforeEach(() => mockCreate.mockClear())
  it('returns same length array', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ translations: ["Xin chào", "Chào buổi sáng"] }) } }] })
    const out = await translateBatch(["Hello world", "Good morning"], "vi", "en", { baseUrl: "https://api.openai.com/v1", apiKey: "sk-test", model: "gpt-4o-mini" })
    expect(out).toHaveLength(2)
    expect(out[0]).toBe("Xin chào")
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
  it('batches 85 items into 3 calls', async () => {
    mockCreate.mockImplementation(async () => ({
      choices: [{ message: { content: JSON.stringify({ translations: Array(40).fill("Xin chào") }) } }]
    }))
    // last batch has 5
    let call = 0
    mockCreate.mockImplementation(async () => {
      call++
      const size = call < 3 ? 40 : 5
      return { choices: [{ message: { content: JSON.stringify({ translations: Array(size).fill("Xin chào") }) } }] }
    })
    const long = Array(85).fill("Hello")
    const out = await translateBatch(long, "vi", "en", { baseUrl: "https://api.openai.com/v1", apiKey: "sk-test", model: "gpt-4o-mini" })
    expect(out).toHaveLength(85)
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })
  it('throws on missing config', async () => {
    await expect(translateBatch(["hi"], "vi", "en", { baseUrl: "", apiKey: "", model: "" })).rejects.toThrow('Missing OpenAI config')
  })
  it('returns empty for empty input', async () => {
    const out = await translateBatch([], "vi", "en", { baseUrl: "http://x", apiKey: "sk", model: "m" })
    expect(out).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
