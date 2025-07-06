default:
  just run

run:
  .ci/tilt-with-cluster.sh

install:
  mise upgrade
  cd apps/frontend && ni
  cd apps/api && ni
