import { spawn } from 'child_process'
import { probeSubtitles } from './ffprobe.js'

export class UnsupportedCodecError extends Error {
  code = 'UNSUPPORTED_CODEC'
  constructor(msg: string) { super(msg); this.name = 'UnsupportedCodecError' }
}
export class NoSubtitleError extends Error {
  code = 'NO_TEXT_SUBTITLE'
  constructor(msg: string) { super(msg); this.name = 'NoSubtitleError' }
}

const TEXT_CODECS = ['subrip','ass','ssa','mov_text','srt']

export async function extractSrt(url: string, streamIndex: number = 0): Promise<string> {
  const streams = await probeSubtitles(url)
  const textStreams = streams.filter(s => TEXT_CODECS.includes(s.codec_name))
  if (streams.length > 0 && textStreams.length === 0) {
    throw new UnsupportedCodecError(`No text subtitle found. Available codecs: ${streams.map(s=>s.codec_name).join(',')} - PGS bitmap not supported in MVP`)
  }
  const target = textStreams[streamIndex] || streams[streamIndex]
  if (!target) throw new NoSubtitleError('No subtitle stream found')
  if (!TEXT_CODECS.includes(target.codec_name)) {
    throw new UnsupportedCodecError(`PGS bitmap not supported: ${target.codec_name}`)
  }
  // Find actual ffmpeg stream position (0:s:0)
  const sIndex = textStreams.indexOf(target)
  return new Promise((resolve, reject) => {
    const args = ['-analyzeduration','20M','-probesize','20M','-i', url, '-map', `0:s:${sIndex >=0 ? sIndex : streamIndex}`, '-c:s','srt','-f','srt','pipe:1']
    const proc = spawn('ffmpeg', args, { timeout: 45000 } as any)
    let out = '', err = ''
    proc.stdout.on('data', d => out += d)
    proc.stderr.on('data', d => err += d)
    proc.on('close', code => {
      if (code===0 && out.trim()) resolve(out)
      else if (out.trim()) resolve(out)
      else reject(new Error(err || `ffmpeg exit ${code}`))
    })
    proc.on('error', reject)
    setTimeout(() => { try{proc.kill()}catch{}; reject(new Error('ffmpeg timeout')) }, 50000)
  })
}
