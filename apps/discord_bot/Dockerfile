FROM rust:1-alpine as builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo install --path .

FROM alpine:latest
COPY --from=builder /app/target/release/discord_bot /usr/local/bin/discord_bot
CMD ["discord_bot"]
