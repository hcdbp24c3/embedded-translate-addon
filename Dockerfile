FROM node:20-bookworm
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/
COPY addon/package.json ./addon/
COPY web/package.json ./web/
RUN npm install --workspaces || npm install
COPY . .
RUN npm run build --workspaces || true
EXPOSE 3000
CMD ["node", "server/src/index.js"]
