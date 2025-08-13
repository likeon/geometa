import ".tilt/scripts/justfile"

default: run

install:
  mise upgrade
  cd apps/frontend && npm i --locked
  cd apps/api && bun i --locked

git-setup-hooks:
  .githooks/setup.sh
