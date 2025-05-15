FROM oven/bun:1 as build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

FROM gcr.io/distroless/base
WORKDIR /app

COPY --from=build /app/server server

ENV NODE_ENV=production
CMD ["./server"]
EXPOSE 3000
