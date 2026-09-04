import { useState, useEffect } from 'react'

const langs = [
  {code:'vi', name:'Tiếng Việt'},
  {code:'en', name:'English'},
  {code:'ja', name:'日本語'},
  {code:'ko', name:'한국어'},
  {code:'zh', name:'中文'},
  {code:'fr', name:'Français'},
  {code:'de', name:'Deutsch'},
  {code:'ru', name:'Русский'},
  {code:'th', name:'ไทย'},
  {code:'es', name:'Español'},
  {code:'ar', name:'العربية'},
]

export default function Configure() {
  const [targetLang, setTargetLang] = useState('vi')
  const [sourceLang, setSourceLang] = useState('auto')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [installUrl, setInstallUrl] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cfg = params.get('config')
    if (cfg) {
      try {
        const decoded = JSON.parse(atob(cfg))
        setTargetLang(decoded.targetLang || 'vi')
        setSourceLang(decoded.sourceLang || 'auto')
        setBaseUrl(decoded.openai?.baseUrl || 'https://api.openai.com/v1')
        setApiKey(decoded.openai?.apiKey || '')
        setModel(decoded.openai?.model || 'gpt-4o-mini')
      } catch {}
    }
  }, [])

  async function test() {
    setTesting(true); setResult(null)
    try {
      const res = await fetch('/api/config/validate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl, apiKey, model }) })
      const data = await res.json()
      setResult(data)
    } catch(e:any) { setResult({ ok:false, error: e.message }) }
    setTesting(false)
  }

  function save() {
    const cfg = { targetLang, sourceLang, openai: { baseUrl, apiKey, model } }
    const b64 = btoa(JSON.stringify(cfg))
    const url = `${window.location.origin}/manifest.json?config=${b64}`
    const stremioUrl = `stremio://${window.location.host}/manifest.json?config=${b64}`
    setInstallUrl(url)
    window.location.href = stremioUrl
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Embedded Translate Config</h1>
      <p className="text-gray-600">Extract built-in SRT/ASS and translate via OpenAI-compatible API. Perfect sync.</p>
      <div>
        <label className="block font-medium">Target Language</label>
        <select value={targetLang} onChange={e=>setTargetLang(e.target.value)} className="border p-2 w-full rounded">
          {langs.map(l=><option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
        </select>
      </div>
      <div>
        <label className="block font-medium">Source Language</label>
        <select value={sourceLang} onChange={e=>setSourceLang(e.target.value)} className="border p-2 w-full rounded">
          <option value="auto">Auto detect</option>
          {langs.map(l=><option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-medium">OpenAI Base URL</label>
        <input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="border p-2 w-full rounded"/>
        <p className="text-xs text-gray-500">Supports OpenAI, Gemini, Groq, Ollama http://localhost:11434/v1</p>
      </div>
      <div>
        <label className="block font-medium">API Key</label>
        <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-..." className="border p-2 w-full rounded"/>
      </div>
      <div>
        <label className="block font-medium">Model</label>
        <input value={model} onChange={e=>setModel(e.target.value)} placeholder="gpt-4o-mini" className="border p-2 w-full rounded"/>
        <p className="text-xs text-gray-500">Suggestions: gpt-4o-mini, gemini-2.0-flash, llama3.1</p>
      </div>
      <button onClick={test} disabled={testing || !apiKey} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 w-full">{testing?'Testing...':'Test Translation'}</button>
      {result && <pre className={`p-3 rounded text-sm ${result.ok ? 'bg-green-50' : 'bg-red-50'}`}>{JSON.stringify(result,null,2)}</pre>}
      <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded w-full font-bold">Save & Install Addon</button>
      {installUrl && <div className="bg-gray-100 p-3 rounded"><p className="text-sm">Copy this URL into Stremio Addons:</p><code className="block break-all text-xs mt-2 bg-white p-2 border">{installUrl}</code></div>}
    </div>
  )
}
