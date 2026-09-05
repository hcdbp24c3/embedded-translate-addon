import { addonBuilder } from 'stremio-addon-sdk'
import { getManifest } from './manifest.js'
import { handleSubtitle } from './subtitle.js'
import { handleStream } from './stream.js'

export function buildAddon(configStr?: string) {
  const manifest = getManifest(configStr)
  const builder = new addonBuilder(manifest)
  builder.defineStreamHandler(handleStream)
  builder.defineSubtitleHandler(handleSubtitle)
  return builder.getInterface()
}

export default buildAddon()
