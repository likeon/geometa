#!/bin/bash

# Database backup script for geometa
# Usage: ./backup.sh [environment]
# Environments: local, prod, preview

set -e

ENVIRONMENT=${1:-local}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$ENVIRONMENT" in
  "local")
    echo "Creating local backup..."
    psql -h localhost -U postgres postgres -f "$SCRIPT_DIR/make-backup.sql" >> /dev/null
    echo "Local backup done"
    ;;
  
  "prod"|"preview")
    ENV_FILE="$SCRIPT_DIR/../../.env.$ENVIRONMENT.local"
    
    if [ ! -f "$ENV_FILE" ]; then
      echo "Error: Environment file $ENV_FILE not found"
      exit 1
    fi
    
    echo "Loading environment from $ENV_FILE..."
    set -a
    source "$ENV_FILE"
    set +a
    
    if [ -z "$DATABASE_URL" ]; then
      echo "Error: DATABASE_URL not found in environment file"
      exit 1
    fi
    
    echo "Dumping database from $ENVIRONMENT..."
    pg_dump -d "$DATABASE_URL" -O -x > "$SCRIPT_DIR/dump.sql"
    
    echo "Recreating local database..."
    echo "drop database if exists geometa with ( force ); create database geometa;" | psql -h localhost -U postgres postgres
    
    echo "Restoring dump to local database..."
    psql -h localhost -U postgres geometa -f "$SCRIPT_DIR/dump.sql"
    
    echo "$ENVIRONMENT backup restored to local database"
    ;;
    
  *)
    echo "Error: Unknown environment '$ENVIRONMENT'"
    echo "Usage: $0 [local|prod|preview]"
    exit 1
    ;;
esac