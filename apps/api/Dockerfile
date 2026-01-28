FROM oven/bun:1.3 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .
RUN bun run build

FROM oven/bun:1.3-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src/lib/db/migrations ./migrations

RUN chown -R bun:bun /app
USER bun

ENV NODE_ENV=production
CMD ["bun", "run", "dist/index.js"]
EXPOSE 3000
