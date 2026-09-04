export interface ParsedEntry { id: number; start: string; end: string; text: string }

export function parseSrt(content: string): ParsedEntry[] {
  if (!content || !content.trim()) return []
  const blocks = content.trim().split(/\n\s*\n/)
  return blocks.map(block => {
    const lines = block.split('\n')
    if (lines.length < 2) return null
    const id = parseInt(lines[0].trim())
    if (isNaN(id)) return null
    const timeLine = lines[1]
    if (!timeLine.includes('-->')) return null
    const [start, end] = timeLine.split(' --> ')
    const text = lines.slice(2).join('\n')
    return { id, start: start.trim(), end: end.trim(), text }
  }).filter(Boolean) as ParsedEntry[]
}

export function rebuildSrt(entries: ParsedEntry[]): string {
  if (entries.length === 0) return ''
  return entries.map(e => `${e.id}\n${e.start} --> ${e.end}\n${e.text}`).join('\n\n') + '\n'
}
