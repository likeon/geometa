#!/usr/bin/env bash
# Provision the pinned Tanaos spam-detection ONNX artifacts for local
# development (optional spam pipeline feature).
#
# Idempotent: artifacts whose SHA-256 already match are left untouched;
# only missing or corrupt files are re-downloaded. Each download lands in a
# temporary sibling path and is atomically renamed into place after its
# checksum passes, so a partial or interrupted download never replaces a
# valid artifact.
#
# Does not start any server or container.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ONNX_RUNTIME_DIR="${PROJECT_ROOT}/.dev/data/onnx-runtime"
ONNX_MODELS_DIR="${ONNX_RUNTIME_DIR}/models"
MODEL_DIR="${ONNX_MODELS_DIR}/tanaos-spam-detection-v1/v1"

# Immutable Hugging Face revision and pinned SHA256 checksums (see plan
# section "Model artifact"). Reconfirm before upgrading.
REVISION="dac7281d03723c7024de552ddec6eac0b4d6fabf"
BASE_URL="https://huggingface.co/onnx-community/tanaos-spam-detection-v1-ONNX/resolve/${REVISION}"

TOKENIZER_PATH="${ONNX_RUNTIME_DIR}/tokenizer.json"
CONFIG_PATH="${ONNX_RUNTIME_DIR}/config.json"
MODEL_PATH="${MODEL_DIR}/model.onnx"

TOKENIZER_SHA="bf1b59b7b11c95f194f51708d918eea378e09d05f84c0e1656dc5180e8117088"
CONFIG_SHA="8d0987aae37a9e9a5c68d4728a7bf4a87813213b7fd2f1d343446e5650f0774b"
MODEL_SHA="a19c00e35d3952880314d6ab51ebb54cdb0240c4e881de7d3ce540403f089802"

curl_args=(
  --fail
  --location
  --silent
  --show-error
  --retry 3
  --retry-delay 2
  --retry-all-errors
)

sha256_of() {
  local file=$1
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${file}" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${file}" | awk '{print $1}'
  else
    echo "error: no sha256 tool (install coreutils or shasum)" >&2
    return 1
  fi
}

# Downloads one artifact atomically; returns 0 on success or skip.
fetch_artifact() {
  local remote_path=$1
  local destination=$2
  local expected_sha=$3
  local label=$4

  mkdir -p "$(dirname "${destination}")"

  if [[ -f "${destination}" ]] && [[ "$(sha256_of "${destination}")" == "${expected_sha}" ]]; then
    echo "[skip] ${label} already valid: ${destination}"
    return 0
  fi

  if [[ -f "${destination}" ]]; then
    echo "[info] ${label} exists but checksum mismatch; replacing" >&2
  fi

  local tmp="${destination}.tmp.$$"
  local ok=0

  for attempt in 1 2 3; do
    if curl "${curl_args[@]}" --output "${tmp}" "${BASE_URL}/${remote_path}"; then
      if [[ "$(sha256_of "${tmp}")" == "${expected_sha}" ]]; then
        mv -f "${tmp}" "${destination}"
        ok=1
        break
      fi
      echo "[error] ${label}: downloaded file failed SHA-256 (attempt ${attempt}/3)" >&2
    else
      echo "[warning] ${label}: download attempt ${attempt}/3 failed" >&2
    fi
  done

  rm -f "${tmp}"
  if [[ "${ok}" -ne 1 ]]; then
    echo "[error] ${label}: giving up after 3 attempts" >&2
    return 1
  fi
  echo "[ok] ${label} -> ${destination}"
}

fetch_artifact "tokenizer.json" "${TOKENIZER_PATH}" "${TOKENIZER_SHA}" "tokenizer.json"
fetch_artifact "config.json" "${CONFIG_PATH}" "${CONFIG_SHA}" "config.json"
fetch_artifact "onnx/model_quantized.onnx" "${MODEL_PATH}" "${MODEL_SHA}" "model.onnx"

echo
echo "Artifacts ready:"
echo "  SPAM_ONNX_TOKENIZER_PATH=${TOKENIZER_PATH}"
echo "  Model: ${MODEL_PATH}"
echo "  Config: ${CONFIG_PATH}"
echo
echo "The disabled process-compose service mounts ${ONNX_MODELS_DIR};"
echo "SPAM_ONNX_API_URL is persisted to mise.local.toml by run.sh."
echo "Spam detection still requires the external Shieldstral endpoint and"
echo "the gateway's other configuration before it can run."
