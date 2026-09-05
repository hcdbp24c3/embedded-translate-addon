export function getManifest(configStr?: string) {
  const hasConfig = !!configStr
  try { if (configStr) JSON.parse(Buffer.from(configStr, 'base64').toString('utf-8')) } catch {}
  return {
    id: 'com.embedded-translate',
    version: '0.1.0',
    name: 'Embedded Translate',
    description: 'Extract built-in subs and translate via OpenAI-compatible API. Perfect sync — tự động bắt stream.',
    resources: ['stream', 'subtitle'],
    types: ['movie','series'],
    idPrefixes: ['tt'],
    behaviorHints: { configurable: true, configurationRequired: !hasConfig },
    config: [{ key: 'config', type: 'text', title: 'Config (base64 from /configure)' }],
    catalogs: []
  }
}
