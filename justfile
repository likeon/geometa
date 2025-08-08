import ".tilt/scripts/justfile"

default: run

install:
  mise upgrade
  cd apps/frontend && ni
  cd apps/api && ni
