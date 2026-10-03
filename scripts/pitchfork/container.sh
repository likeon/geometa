#!/usr/bin/env bash

name=${1:?Expected daemon ID}
shift

"${CONTAINER_ENGINE:-podman}" run --rm --replace --name "${name//\//-}" "$@"
