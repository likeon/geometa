FROM oven/bun:1 as build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app

COPY --from=build /app/server server
COPY src/lib/db/migrations ./migrations

ENV NODE_ENV=production
CMD ["./server"]
EXPOSE 3000
