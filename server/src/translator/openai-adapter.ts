import OpenAI from 'openai'

export interface OpenAIConfig { baseUrl: string; apiKey: string; model: string; temperature?: number }

// Vietnamese pronoun guide for better translation
const VIETNAMESE_PRONOUN_GUIDE = `
CRITICAL - Vietnamese pronoun & honorific rules (for targetLang=vi):
- Preserve gender, age, and relationship from context. Do NOT default to "ông" or "tôi".
- Common pronouns: tôi/mình (I), bạn/cậu (you informal), anh (older male), chị (older female), em (younger), cô/chú/bác (aunt/uncle), ông/bà (grandfather/grandmother), thầy/cô (teacher), sếp (boss).
- If speaker is female, do NOT translate "I" as "ông" or "anh". Infer from nearby dialogue. Example: if previous line is "Onee-chan?" then speaker is younger sibling -> "em".
- Keep consistent: if character A calls character B "em" in line 5, keep "em" in line 12.
- Honorifics: -san/-chan/-kun, senpai, sensei -> keep or localize naturally (e.g., "senpai" -> "anh" if older male).
- Use natural Vietnamese sentence structure, keep sentence length similar for timing.
- Keep line breaks \\n exactly.
- Do NOT add explanations, keep translation concise for subtitle.
`.trim()

export async function translateBatch(texts: string[], targetLang: string, sourceLang: string, config: OpenAIConfig): Promise<string[]> {
  if (texts.length === 0) return []
  if (!config.baseUrl || !config.apiKey || !config.model) throw new Error('Missing OpenAI config: baseUrl, apiKey, model required')
  const client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey })
  const batches: string[][] = []
  for (let i=0;i<texts.length;i+=40) batches.push(texts.slice(i,i+40))
  const results: string[] = []
  for (const batch of batches) {
    // Build pronoun-aware prompt
    const isVietnamese = targetLang.toLowerCase().startsWith('vi')
    const guide = isVietnamese ? `\n\n${VIETNAMESE_PRONOUN_GUIDE}\n` : ''
    const contextHint = batch.length > 1 ? `Context: these are consecutive subtitle lines from same scene. Keep pronouns and tone consistent across the batch.` : ''
    const prompt = `Translate the following subtitles from ${sourceLang} to ${targetLang}. Return ONLY JSON object {"translations": ["...", "..."]} with same order and length (${batch.length}). Keep line breaks \\n. Do not add numbering.${guide}\n${contextHint}\nInput: ${JSON.stringify(batch)}`

    const res = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: isVietnamese ? 'You are a professional Vietnamese subtitle translator. You preserve character gender, age and relationships when choosing pronouns. You keep timing-friendly concise translations.' : 'You are a professional subtitle translator. Preserve context and pronoun consistency.' },
        { role: 'user', content: prompt }
      ],
      temperature: config.temperature ?? 0.3,
      response_format: { type: 'json_object' } as any
    })
    const content = res.choices[0]?.message?.content || '{"translations":[]}'
    let parsed: any
    try { parsed = JSON.parse(content) } catch { throw new Error(`Invalid JSON from model: ${content.slice(0,300)}`) }
    const arr = parsed.translations || parsed
    if (!Array.isArray(arr)) throw new Error(`Expected array, got ${typeof arr}`)
    if (arr.length !== batch.length) throw new Error(`Length mismatch: expected ${batch.length}, got ${arr.length}`)
    results.push(...arr.map((s:any)=> String(s)))
  }
  return results
}
