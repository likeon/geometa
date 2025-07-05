FROM rust:1-bookworm as builder
WORKDIR /app
COPY . .
RUN cargo install --path .

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/discord-bot /usr/local/bin/discord-bot
CMD ["discord-bot"]
