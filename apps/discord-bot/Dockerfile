FROM rust:1-bookworm AS builder

RUN cargo install sccache --locked

ENV RUSTC_WRAPPER=sccache
ENV SCCACHE_DIR=/sccache

WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/sccache cargo install --path .

FROM gcr.io/distroless/cc-debian12:debug
COPY --from=builder /app/target/release/discord-bot /usr/local/bin/discord-bot
ENTRYPOINT []
CMD ["/usr/local/bin/discord-bot"]
