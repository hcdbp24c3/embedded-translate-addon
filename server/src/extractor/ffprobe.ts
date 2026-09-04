import { execFile } from 'child_process'
import { promisify } from 'util'
const exec = promisify(execFile)

export interface StreamInfo { index: number; codec_name: string; codec_type: string; language?: string; title?: string }

export async function probeSubtitles(url: string): Promise<StreamInfo[]> {
  const cmd = 'ffprobe'
  const args = ['-v','error','-select_streams','s','-show_entries','stream=index,codec_name,codec_type:stream_tags=language,title','-of','json', url]
  try {
    const { stdout } = await execFileAsync(cmd, args)
    const data = JSON.parse(stdout)
    return (data.streams || []).map((s:any) => ({
      index: s.index,
      codec_name: s.codec_name,
      codec_type: s.codec_type,
      language: s.tags?.language,
      title: s.tags?.title
    }))
  } catch (e:any) {
    // try with timeout
    throw e
  }
}

function execFileAsync(cmd: string, args: string[]): Promise<{stdout:string, stderr:string}> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 45000, maxBuffer: 10*1024*1024 }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout: stdout as string, stderr: stderr as string })
    })
  })
}
