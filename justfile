default:
  just run

run:
  .dev/tilt-with-cluster.sh

install:
  mise upgrade
  cd apps/frontend && ni
  cd apps/api && ni
