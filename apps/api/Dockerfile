FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libvips42 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/server server
COPY src/lib/db/migrations ./migrations

ENV NODE_ENV=production
CMD ["./server"]
EXPOSE 3000
