import { createHash } from 'crypto'
export function cacheKey(imdbId: string, targetLang: string, model: string, fileHash?: string) {
  return createHash('md5').update(`${imdbId}:${fileHash||'top'}:${targetLang}:${model}`).digest('hex')
}
