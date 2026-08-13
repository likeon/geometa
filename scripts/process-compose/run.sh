#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
POSTGRES_DATA_DIR="${PROJECT_ROOT}/.dev/data/postgres"

set -a
# Project configuration must override stale values inherited from caller.
# shellcheck disable=SC1091
source "${PROJECT_ROOT}/process-compose.env"
set +a

select_container_engine() {
  if [ -n "${CONTAINER_ENGINE:-}" ]; then
    case "${CONTAINER_ENGINE}" in
    podman | docker) ;;
    *)
      echo "Error: CONTAINER_ENGINE must be podman or docker" >&2
      return 1
      ;;
    esac

    if ! command -v "${CONTAINER_ENGINE}" >/dev/null 2>&1; then
      echo "Error: ${CONTAINER_ENGINE} is not installed" >&2
      return 1
    fi
  elif command -v podman >/dev/null 2>&1; then
    CONTAINER_ENGINE=podman
  elif command -v docker >/dev/null 2>&1; then
    CONTAINER_ENGINE=docker
  else
    echo "Error: Install Podman or Docker before running local development" >&2
    return 1
  fi
}

allocate_port() {
  local variable_name=$1
  local initial_port=${!variable_name}
  local available_port

  available_port=$(get-port "${initial_port}")
  printf -v "${variable_name}" '%s' "${available_port}"
  export "${variable_name?}"
}

persist_ports() {
  mise set --file "${PROJECT_ROOT}/mise.local.toml" \
    "PROCESS_COMPOSE_PORT_POSTGRES=${PROCESS_COMPOSE_PORT_POSTGRES}" \
    "PROCESS_COMPOSE_PORT_API=${PROCESS_COMPOSE_PORT_API}" \
    "PROCESS_COMPOSE_PORT_FRONTEND=${PROCESS_COMPOSE_PORT_FRONTEND}"
}

select_container_engine
if [ "${CONTAINER_ENGINE}" = "podman" ]; then
  CONTAINER_USERNS_OPTION="--userns=keep-id:uid=999,gid=999"
else
  CONTAINER_USERNS_OPTION=""
fi
export CONTAINER_ENGINE CONTAINER_USERNS_OPTION POSTGRES_DATA_DIR

allocate_port PROCESS_COMPOSE_PORT_POSTGRES
allocate_port PROCESS_COMPOSE_PORT_API
allocate_port PROCESS_COMPOSE_PORT_FRONTEND
persist_ports
DEV_DATABASE_URL="postgres://postgres:postgres@localhost:${PROCESS_COMPOSE_PORT_POSTGRES}/geometa"
export DEV_DATABASE_URL

mkdir -p "${POSTGRES_DATA_DIR}"

RUN_ID="${PROJECT_NAME}-$(date +%s)"
POSTGRES_CONTAINER_NAME="postgres-${RUN_ID}"
export POSTGRES_CONTAINER_NAME

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  set +e

  "${CONTAINER_ENGINE}" rm -f "${POSTGRES_CONTAINER_NAME}" >/dev/null 2>&1

  exit "${exit_code}"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd "${PROJECT_ROOT}"
mise exec -- process-compose
