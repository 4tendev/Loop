FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS web-builder

COPY app ./app
COPY lib ./lib
COPY public ./public
COPY types ./types
COPY next-env.d.ts ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./
RUN npm run build

FROM deps AS production-deps

RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY db ./db
COPY scripts ./scripts

FROM runtime AS server

ENV AVALON_WS_HOST=0.0.0.0
ENV AVALON_WS_PORT=3001

COPY server ./server

EXPOSE 3001

CMD ["sh", "-c", "node scripts/migrate.mjs && node server/avalon-server.mjs"]

FROM runtime AS web

COPY --from=web-builder /app/.next ./.next
COPY --from=web-builder /app/public ./public
COPY --from=web-builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["sh", "-c", "node scripts/migrate.mjs && npm run start"]

FROM nginx:1.27-alpine AS nginx

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
