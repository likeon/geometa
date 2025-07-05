FROM rust:1-bookworm AS builder
WORKDIR /app
COPY . .
RUN cargo install --path .

FROM gcr.io/distroless/cc-debian12:debug
COPY --from=builder /app/target/release/discord-bot /usr/local/bin/discord-bot
CMD ["discord-bot"]
