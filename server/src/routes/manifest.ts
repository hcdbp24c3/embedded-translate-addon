import { FastifyInstance } from 'fastify'

function getManifest(configStr?: string) {
  const hasConfig = !!configStr
  return {
    id: 'com.embedded-translate',
    version: '0.1.0',
    name: 'Embedded Translate',
    description: 'Extract built-in subs and translate via OpenAI-compatible API. Perfect sync.',
    resources: ['subtitle'],
    types: ['movie','series'],
    idPrefixes: ['tt'],
    behaviorHints: { configurable: true, configurationRequired: !hasConfig },
    config: [{ key: 'config', type: 'text', title: 'Config (base64 from /configure)' }],
    catalogs: []
  }
}

export default async function manifestRoutes(app: FastifyInstance) {
  app.get('/manifest.json', async (req, reply) => {
    const { config } = req.query as any
    const manifest = getManifest(config)
    reply.header('Access-Control-Allow-Origin', '*')
    return manifest
  })
}
