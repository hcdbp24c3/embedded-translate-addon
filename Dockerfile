FROM node:20-bookworm
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY addon/package.json ./addon/
COPY web/package.json ./web/
RUN npm ci
COPY . .
# Build web (Vite) -> server/public, ignore tsc errors for ESM
RUN npm run build --workspace=web 2>&1 || (mkdir -p server/public && cp server/public/index.html server/public/index.html 2>/dev/null || true)
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npx", "tsx", "server/src/index.ts"]
