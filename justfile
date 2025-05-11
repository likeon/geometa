default:
  just run

run:
  .ci/tilt-with-cluster.sh

db-psql:
  psql -h localhost -U postgres geometa

environment := "local"
db-dump:
  @if [ "{{environment}}" = "local" ]; then \
    psql -h localhost -U postgres postgres -f .ci/db/make-backup.sql >> /dev/null; \
    echo "Local backup done"; \
  elif [ "{{environment}}" = "prod" ] || [ "{{environment}}" = "preview" ]; then \
    source .env.{{environment}}.local; \
    pg_dump -d "$$DATABASE_URL" -O -x > .ci/db/dump.sql; \
    echo "drop database if exists geometa with ( force ); create database geometa;" | psql -h localhost -U postgres postgres; \
    psql -h localhost -U postgres geometa -f .ci/db/dump.sql; \
  else \
    echo "Unknown environment"; exit 1; \
  fi

db-reset:
  psql -h localhost -U postgres postgres -f .ci/db/reset.sql

frontend-build-and-deploy:
  cd apps/frontend && \
    podman build . -t ghcr.io/likeon/geometa-web:latest --arch arm64 && \
    podman push ghcr.io/likeon/geometa-web:latest
  KUBECONFIG=$(pwd)/cluster/talos/kubeconfig kubectl -n geometa-prod rollout restart deployment frontend
