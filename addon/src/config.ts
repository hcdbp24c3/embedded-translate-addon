export function decodeConfig(str?: string) {
  if (!str) return null
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch { return null }
}
export function encodeConfig(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}
