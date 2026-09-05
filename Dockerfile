FROM node:20-bookworm

RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY addon/package.json ./addon/
COPY web/package.json ./web/

RUN npm ci

COPY . .

# Build Web UI (Vite -> server/public)
RUN npm run build --workspace=web

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npx", "tsx", "server/src/index.ts"]
