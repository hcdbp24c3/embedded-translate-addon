# Embedded Translate Addon

Stremio addon that extracts built-in SRT/ASS subtitles via FFmpeg Range Request and translates via OpenAI-compatible API. Perfect sync - no more out-of-sync subs.

## Quick Start

```bash
docker compose up --build
# Open http://localhost:5100/configure
# Enter OpenAI baseURL, API key, model, target language
# Save -> stremio:// install link
```

## Manual Dev

```bash
npm install
npm test
# Server: node --watch server/src/index.ts
# Web: vite dev
```

## API

- `GET /health` -> { ffmpeg, redis, version }
- `POST /api/config/validate` { baseUrl, apiKey, model } -> { ok, latency }
- `POST /api/subtitle` { imdbId, type, targetLang, openai, url, fileHash? } -> { subtitles: [{url, lang}] }
- `GET /sub/:id/:lang.srt` -> srt file
- `GET /manifest.json?config=...` -> stremio manifest
- `GET /configure` -> Web UI

## Env

- `PORT=3000`
- `PUBLIC_URL=http://localhost:5100`
- `REDIS_URL=redis://redis:6379` (optional, fallback memory)
- `TORBOX_TOKEN=...` (optional, for torrent resolve)

## Supported

- WEB-DL/WEBRip/Encoded MKV with `subrip`/`ass` text subs -> full support
- BDRemux with `hdmv_pgs_subtitle` (bitmap) -> returns 400 UNSUPPORTED_CODEC (v2 OCR)
