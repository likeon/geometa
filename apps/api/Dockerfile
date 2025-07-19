# multi-stage build didn't play well with sharp
# but it's probably fixable
FROM oven/bun:1 AS build
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libvips42 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

COPY src/lib/db/migrations ./migrations

RUN chown -R bun:bun /app

USER bun

ENV NODE_ENV=production
CMD ["./server"]
EXPOSE 3000
