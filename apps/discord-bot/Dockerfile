FROM docker.io/lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release --bin discord-bot

FROM gcr.io/distroless/cc-debian12 AS runtime
WORKDIR /app
USER 1000
COPY --from=builder --chown=1000:1000 /app/target/release/discord-bot /usr/local/bin/discord-bot
ENTRYPOINT []
CMD ["/usr/local/bin/discord-bot"]
