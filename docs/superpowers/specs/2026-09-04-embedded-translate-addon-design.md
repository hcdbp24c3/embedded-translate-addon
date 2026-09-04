# Embedded Subtitle Translate Addon - Design Spec

**Date:** 2026-09-04
**Status:** Approved (Sections 1-5 reviewed)
**Stack:** Node.js (Fastify + stremio-addon-sdk), FFmpeg 7.1, Redis/SQLite, Vite + Tailwind, OpenAI-compatible

## 1. Overview & Problem

### Problem
- Subtitles on Stremio via Opensubtitles often out-of-sync (timing mismatch due to different encodes).
- Built-in subtitles muxed in mkv/mp4/m2ts have perfect timing (100% sync).

### Goal (MVP Text-only)
- Stremio addon that extracts **text-based** built-in subtitles (`subrip/srt`, `ass/ssa`) from torrent/http files via HTTP Range Request, translates them to user-chosen target language via OpenAI-compatible API, and serves as `.srt` with original timestamps.
- Scope: Only `srt/ass` (covers ~80% WEB-DL/WEBRip). PGS/DVD bitmap subtitles are out-of-scope for MVP (graceful fallback).
- Must support: torrent (via Torbox/RD direct link resolved), direct http, multi-language auto.
- Configurable via Web UI embedded in Stremio (OpenAI baseURL, apiKey, model, targetLang).

### Spike Finding (2026-09-04)
- Tested with `Upgrade [2018] UHD BDRemux 2160p` (88.6GB, `00000.m2ts`) via Torbox link `https://nexus.hare.tb-cdn.earth/dld/...`.
- `ffprobe` over HTTP with `Accept-Ranges: bytes` works with only ~10MB header (no full download).
- File contains 7x `hdmv_pgs_subtitle` (bitmap) - confirmed `ffmpeg -> srt` fails with `Subtitle encoding only possible from text to text or bitmap to bitmap` - requires OCR. Validates MVP scope decision.

## 2. Architecture

```
[Web UI /configure] ──► [Backend Fastify] ◄── [Stremio Addon (stremio-addon-sdk)]
        │                      │                        │
        │                      ▼                        ▼
        │                [Redis/SQLite Cache]    [Stremio Client]
        │                      │               (Torrentio + This Addon)
        │                      ▼
        │               [FFmpeg Extractor]
        │                - ffprobe via HTTP
        │                - Range Request
        │                - SRT/ASS only
        │                      ▼
        │               [Translator Service]
        │                OpenAI-compatible
        └──────────────────────┘
```

- Monorepo: `/addon`, `/server`, `/web`
- Addon + Web UI stateless, config in Stremio `?config=base64(json)` per request.
- Backend single Docker container: Node 20 + FFmpeg 7.1 + Vite static.
- Host: user-provided (single `docker run`).

## 3. Components

### 3.1 Stremio Addon (`/addon`)
- `stremio-addon-sdk@1.6+`
- Manifest:
```json
{
  "id": "com.embedded-translate",
  "name": "Embedded Translate",
  "version": "0.1.0",
  "resources": ["subtitle"],
  "types": ["movie", "series"],
  "catalogs": [],
  "idPrefixes": ["tt"],
  "behaviorHints": { "configurable": true, "configurationRequired": true },
  "config": [{ "key": "config", "type": "text" }]
}
```
- Stremio config screen URL: `https://your-host/configure`
- Handler `GET /subtitle/:type/:id.json?config=...`:
  1. Decode `config` (targetLang, openai baseUrl/key/model, sourceLang)
  2. `POST https://your-host/api/subtitle { imdbId, type, season, episode, targetLang, sourceLang, openai }`
  3. Return `{ subtitles: [{ id: "embedded-vi", url: "https://your-host/sub/:id/:lang.srt", lang, url }]}`
- MVP subtitle-independent: backend resolves torrent via Torrentio API top result (WEB-DL with srt). v1.1: support StremThru `behaviorHints` streamUrl if available.

### 3.2 Backend (`/server` - Fastify)
- Endpoints:
  - `POST /api/subtitle` -> resolve + extract + translate + cache
  - `GET /sub/:id/:lang.srt` -> serve srt
  - `POST /api/config/validate` -> test translate
  - `GET /health` -> ffmpeg/redis check
  - `GET /manifest.json` -> dynamic manifest with config
  - `GET /configure` -> serve Web UI static
- Deps: `fastify`, `fluent-ffmpeg`, `ffprobe-static`, `srt-parser-2`, `ass-compiler`, `ioredis` or `better-sqlite3`, `openai` SDK, `franc` (lang detect optional).
- Queue: sync for MVP, BullMQ optional for async.

### 3.3 Web UI (`/web` - Vite + Tailwind)
- Route `/configure` (iframe in Stremio).
- Fields:
  - Target Language dropdown (50 langs: vi, en, fr, ja, ko, zh, ru, th, etc.)
  - Source Language (auto / eng / rus / ...)
  - OpenAI Base URL (default `https://api.openai.com/v1`)
  - API Key (password)
  - Model (input + suggest `gpt-4o-mini`, `gemini-2.0-flash`, `llama3.1`)
  - Cache toggle (default on)
  - Buttons: Test Translation, Save & Install
- Save: `configStr = btoa(JSON.stringify(formValues))` -> redirect to `stremio://` or show `https://your-host/manifest.json?config=...`
- Validation: `POST /api/config/validate` with `["Hello world", "Good morning"]` -> show result + latency.
- Security: API key not persisted on server disk, only in Stremio config string per request.

### 3.4 Translator Service (`/server/translator/openai-adapter.ts`)
- Interface: `translateBatch(texts: string[], targetLang: string, sourceLang?: string): Promise<string[]>`
- Adapter: `OpenAICompatibleAdapter` using `openai` SDK with custom `baseURL`:
  - Supports OpenAI, Gemini (openai compat), Groq, Together, Ollama (`http://localhost:11434/v1`), LM Studio.
- Prompt:
```
Translate from {sourceLang} to {targetLang}. Return ONLY JSON object {"translations": ["...", "..."]} with same length and order. Keep \n line breaks.
Input: ["text1", "text2"]
```
- Config: `model`, `temperature: 0.3`, `response_format: {type: "json_object"}`
- Batch: 40 lines/request, retry 2, preserve `id` for rebuild.
- Auto-detect: if sourceLang=auto, use ffprobe `language` tag or let AI detect.

## 4. Data Flow

### Flow A - Configure (once)
1. User installs `https://your-host/manifest.json` -> Stremio opens `https://your-host/configure`
2. User fills form -> Save -> Test -> `POST /api/config/validate` -> ok -> gen `config` -> redirect to Stremio

### Flow B - Watch (per video)
```
Stremio GET /subtitle/movie/tt3896198.json?config=... 
-> Addon POST /api/subtitle {imdbId, targetLang, openai}
-> Backend:
   1. Cache check `tt3896198:vi` -> hit ? 302 /sub/...
   2. Find torrent: Torrentio API search imdbId -> top WEB-DL with srt
   3. Resolve direct link: Torbox API `requestdl` or use http directly
   4. ffprobe: `ffprobe -show_streams -select_streams s <url>` -> find subrip/ass + language
      - if no text sub -> return {error: "NO_TEXT_SUBTITLE"}
   5. Extract: `ffmpeg -i <url> -map 0:s:0 -c:s srt pipe:1` -> original.srt
   6. Parse -> batch 40 -> OpenAICompatibleAdapter.translateBatch -> rebuild srt with original timestamps
   7. Save `/data/subs/tt3896198_vi.srt` + Redis SET TTL 30d
   8. Return to Addon -> Stremio loads srt
```

### API Contract
```
POST /api/subtitle
Body: { imdbId: string, type: "movie"|"series", season?: number, episode?: number, targetLang: string, sourceLang?: string, openai: { baseUrl: string, apiKey: string, model: string, temperature?: number } }
Response 200: { subtitles: [{ id: string, url: string, lang: string, source: "embedded" }] }
Response 404: { error: "NO_TEXT_SUBTITLE", message: "No srt/ass found, try WEB-DL version" }
Response 400: { error: "UNSUPPORTED_CODEC", message: "PGS bitmap not supported in MVP" }

GET /sub/:id/:lang.srt -> text/plain; Content-Disposition

POST /api/config/validate
Body: { baseUrl: string, apiKey: string, model: string }
Response: { ok: true, latency: number, sample: string } | { ok: false, error: string }

GET /health -> { ffmpeg: boolean, redis: boolean }
GET /manifest.json?config=... -> stremio manifest
GET /configure -> static web
```

## 5. Error Handling, Cache, Deploy, Testing

### 5.1 Error Handling
- `NO_TEXT_SUBTITLE` -> return empty subtitles + log, Stremio shows fallback message.
- `UNSUPPORTED_CODEC (hdmv_pgs_subtitle, dvd_subtitle)` -> 400 with message "PGS bitmap requires OCR, use WEB-DL".
- `TRANSLATE_FAILED` -> retry 2, then return original untranslated srt + flag.
- `FFPROBE_TIMEOUT` -> analyzeduration 20M, timeout 45s, fallback to next torrent.

### 5.2 Cache
- Key: `md5(imdbId + fileHash + targetLang + model)`; fileHash = infoHash if available else imdbId top result.
- Store: file `/data/subs/:id_:lang.srt` + Redis `SET key -> url` TTL 30d.
- Hit rate ~90% after 1 week.
- Invalidation on model change or TTL.

### 5.3 Deploy
- Dockerfile: `FROM node:20` + `apt install ffmpeg` + `COPY addon server web` + `RUN npm build`
- `docker-compose.yml`: `server` (port 3000) + `redis` (optional, fallback `better-sqlite3`)
- Host run: `docker run -p 5100:3000 -v ./data:/data -e REDIS_URL=... image`
- Env: `PORT=3000`, `REDIS_URL`, `TORBOX_TOKEN` (for resolve), `TORRENTIO_URL`.

### 5.4 Testing & Verify
- Unit: srt-parser, translator mock, config encode/decode.
- Integration: ffprobe with fixtures (mkv srt -> pass, m2ts pgs -> expect 400).
- E2E: Use real WEB-DL torrent (e.g., `Upgrade 2018 1080p WEB-DL srt`) not BDRemux.
  ```bash
  curl "http://localhost:3000/subtitle/movie/tt3896198.json?config=..."
  # expect 200 + url
  curl http://localhost:3000/sub/tt3896198/vi.srt | head -n 20
  # expect timestamps preserved
  curl -X POST http://localhost:3000/api/config/validate -d '{"baseUrl":"...","apiKey":"...","model":"gpt-4o-mini"}'
  ```

## 6. Non-Goals (MVP)
- OCR for PGS/DVD bitmap (v2)
- Full torrent client (use direct http via Torbox)
- All-in-one stream+subtitle addon (v1 is subtitle-only)
- Server-side API key billing (user brings own key)

## 7. Future (v2)
- PGS OCR via `pgsrip` + Tesseract
- All-in-one addon with streamUrl forwarding
- Batch pre-translate popular movies
- Support `ass` styling preservation

## 8. File Structure
```
/addon
  manifest.js
  index.js (stremio-addon-sdk)
  subtitle.js
/server
  src/
    index.ts (fastify)
    routes/subtitle.ts, config.ts, health.ts, manifest.ts
    extractor/ffprobe.ts, ffmpeg.ts
    translator/openai-adapter.ts, index.ts
    cache/redis.ts
    utils/srt.ts, config.ts
  data/subs/ (volume)
  public/ (web build)
/web
  src/
    Configure.tsx
    api.ts
  vite.config.ts
Dockerfile
docker-compose.yml
```

## 9. Verification Checklist
- [ ] `GET /health` returns ffmpeg true
- [ ] `POST /api/config/validate` with valid key returns ok
- [ ] `POST /api/subtitle` with WEB-DL imdbId returns srt url in <45s (cold) <1s (cached)
- [ ] Served srt timestamps match original
- [ ] PGS file returns 400 UNSUPPORTED_CODEC gracefully
- [ ] Web UI Save generates correct `stremio://` link
