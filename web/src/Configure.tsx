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

function tryDecodeConfig(str: string): any | null {
  if (!str) return null
  // handle URL encoding, padding
  try {
    let s = decodeURIComponent(str)
    // fix URL-safe base64
    s = s.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    return JSON.parse(atob(s))
  } catch {
    try { return JSON.parse(atob(str)) } catch { return null }
  }
}

export default function Configure() {
  const [targetLang, setTargetLang] = useState('vi')
  const [sourceLang, setSourceLang] = useState('auto')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [torboxToken, setTorboxToken] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [installUrl, setInstallUrl] = useState('')
  const [parsedFromUrl, setParsedFromUrl] = useState(false)

  useEffect(() => {
    // Parse config from ?config= in URL (supports both /configure and redirect from /manifest.json)
    const params = new URLSearchParams(window.location.search)
    let cfgStr = params.get('config')
    // also check hash
    if (!cfgStr && window.location.hash.includes('config=')) {
      cfgStr = new URLSearchParams(window.location.hash.slice(1)).get('config')
    }
    // also check if parent passed config via postMessage (Stremio iframe)
    const decoded = cfgStr ? tryDecodeConfig(cfgStr) : null
    if (decoded) {
      setTargetLang(decoded.targetLang || 'vi')
      setSourceLang(decoded.sourceLang || 'auto')
      setBaseUrl(decoded.openai?.baseUrl || 'https://api.openai.com/v1')
      setApiKey(decoded.openai?.apiKey || '')
      setModel(decoded.openai?.model || 'gpt-4o-mini')
      setTorboxToken(decoded.torboxToken || decoded.torboxApiKey || '')
      setParsedFromUrl(true)
    } else {
      // try localStorage last config
      try {
        const saved = localStorage.getItem('embedded-translate-config')
        if (saved) {
          const d = JSON.parse(saved)
          setTargetLang(d.targetLang || 'vi')
          setSourceLang(d.sourceLang || 'auto')
          setBaseUrl(d.openai?.baseUrl || 'https://api.openai.com/v1')
          setApiKey(d.openai?.apiKey || '')
          setModel(d.openai?.model || 'gpt-4o-mini')
          setTorboxToken(d.torboxToken || '')
        }
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
    const cfg: any = { targetLang, sourceLang, openai: { baseUrl, apiKey, model } }
    if (torboxToken) cfg.torboxToken = torboxToken
    localStorage.setItem('embedded-translate-config', JSON.stringify(cfg))
    const b64 = btoa(JSON.stringify(cfg))
    const url = `${window.location.origin}/manifest.json?config=${b64}`
    const stremioUrl = `stremio://${window.location.host}/manifest.json?config=${b64}`
    setInstallUrl(url)
    // update URL to reflect config for bookmarking
    window.history.replaceState({}, '', `?config=${encodeURIComponent(b64)}`)
    window.location.href = stremioUrl
    // fallback if stremio protocol blocked
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        // still here, show copy hint
      }
    }, 500)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Embedded Translate — Configure</h1>
      <p className="text-gray-600">Extract built-in SRT/ASS and translate via OpenAI-compatible API. Perfect sync.</p>
      {parsedFromUrl && <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">✓ Đã tự động điền config từ URL manifest.json?config=</div>}

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
        <p className="text-xs text-gray-500">Supports OpenAI, Gemini, Groq, Ollama http://localhost:11434/v1, Qwen http://66.36.226.70:8008/v1</p>
      </div>

      <div>
        <label className="block font-medium">API Key</label>
        <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-... / 1" className="border p-2 w-full rounded"/>
      </div>

      <div>
        <label className="block font-medium">Model</label>
        <input value={model} onChange={e=>setModel(e.target.value)} placeholder="gpt-4o-mini" className="border p-2 w-full rounded"/>
        <p className="text-xs text-gray-500">Suggestions: gpt-4o-mini, gemini-2.0-flash, Qwen3-5B, llama3.1</p>
      </div>

      <div>
        <label className="block font-medium">Torbox API Key (optional)</label>
        <input type="password" value={torboxToken} onChange={e=>setTorboxToken(e.target.value)} placeholder="f5a4bb8d-... (để resolve torrent không có http link)" className="border p-2 w-full rounded"/>
        <p className="text-xs text-gray-500">Nếu để trống, addon sẽ chỉ dịch khi stream đã có http link sẵn. Điền key để hỗ trợ torrent pure.</p>
      </div>

      <button onClick={test} disabled={testing || !apiKey} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 w-full">{testing?'Testing...':'Test Translation'}</button>
      {result && <pre className={`p-3 rounded text-sm overflow-auto ${result.ok ? 'bg-green-50' : 'bg-red-50'}`}>{JSON.stringify(result,null,2)}</pre>}

      <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded w-full font-bold">Save & Install Addon</button>

      {installUrl && <div className="bg-gray-100 p-3 rounded"><p className="text-sm">Nếu Stremio không tự mở, copy URL này vào Stremio → Addons → Add Addon:</p><code className="block break-all text-xs mt-2 bg-white p-2 border">{installUrl}</code><p className="text-xs mt-2">Hoặc mở trực tiếp: <a href={installUrl} className="text-blue-600 underline">{installUrl}</a></p></div>}

      <div className="text-xs text-gray-500 pt-4 border-t">
        <p>Tip: URL manifest của bạn là <code>manifest.json?config=...</code>. Mở <code>/configure?config=...</code> sẽ tự động điền lại như trên.</p>
      </div>
    </div>
  )
}
