mod api "apps/api"

default: run

run:
    ./scripts/process-compose/run.sh

install:
    mise upgrade
    prek install -t pre-commit -t pre-push
    cd apps/frontend && npm ci
    cd apps/api && bun i --locked
    cd userscript/ && pnpm install --frozen-lockfile
