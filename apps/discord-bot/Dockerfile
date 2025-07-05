FROM rust:1-alpine as builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo install --path .

FROM alpine:latest
COPY --from=builder /app/target/release/discord-bot /usr/local/bin/discord-bot
CMD ["discord-bot"]
