import OpenAI from 'openai'

export interface OpenAIConfig { baseUrl: string; apiKey: string; model: string; temperature?: number }

export async function translateBatch(texts: string[], targetLang: string, sourceLang: string, config: OpenAIConfig): Promise<string[]> {
  if (texts.length === 0) return []
  if (!config.baseUrl || !config.apiKey || !config.model) throw new Error('Missing OpenAI config: baseUrl, apiKey, model required')
  const client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey })
  const batches: string[][] = []
  for (let i=0;i<texts.length;i+=40) batches.push(texts.slice(i,i+40))
  const results: string[] = []
  for (const batch of batches) {
    const prompt = `Translate the following subtitles from ${sourceLang} to ${targetLang}. Return ONLY JSON object {"translations": ["...", "..."]} with same order and length (${batch.length}). Keep line breaks \\n. Input: ${JSON.stringify(batch)}`
    const res = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature ?? 0.3,
      response_format: { type: 'json_object' } as any
    })
    const content = res.choices[0]?.message?.content || '{"translations":[]}'
    let parsed: any
    try { parsed = JSON.parse(content) } catch { throw new Error(`Invalid JSON from model: ${content.slice(0,200)}`) }
    const arr = parsed.translations || parsed
    if (!Array.isArray(arr)) throw new Error(`Expected array, got ${typeof arr}`)
    if (arr.length !== batch.length) throw new Error(`Length mismatch: expected ${batch.length}, got ${arr.length}`)
    results.push(...arr.map((s:any)=> String(s)))
  }
  return results
}
