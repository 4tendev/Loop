FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine

ENV NODE_ENV=production
ENV AVALON_WS_HOST=0.0.0.0
ENV AVALON_WS_PORT=3001

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY db ./db
COPY scripts ./scripts
COPY server ./server

EXPOSE 3001

CMD ["sh", "-c", "node scripts/migrate.mjs && node server/avalon-server.mjs"]
