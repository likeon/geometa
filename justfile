import ".tilt/scripts/justfile"
mod api "apps/api"

default: run

install:
  mise upgrade
  cd apps/frontend && npm ci
  cd apps/api && bun i --locked
  cd userscript/ && npm ci

git-setup-hooks:
  .githooks/setup.sh
