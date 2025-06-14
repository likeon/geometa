#!/bin/bash
#
# Adapted from:
# https://github.com/kubernetes-sigs/kind/commits/master/site/static/examples/kind-with-registry.sh
#
# Copyright 2020 The Kubernetes Project
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -o errexit

# desired cluster name; default is "kind"
KIND_CLUSTER_NAME="${KIND_CLUSTER_NAME:-kind}"
KIND_CLUSTER_OPTS="--name ${KIND_CLUSTER_NAME}"

PROJECT_LOCAL_DATA_PATH="$HOME/.local/share/$(basename $(pwd))/"

if [ -n "$(podman ps -q -f "name=^/kind-control-plane$")" ]; then
    echo "Cluster already running"
    exit 0
fi

if [ -n "$(podman ps -a -q -f "name=^/kind-control-plane$")" ]; then
    echo "Removing old cluster node"
    podman rm "$(podman ps -a -q -f "name=^/kind-control-plane$")"
fi



if [ -n "${KIND_CLUSTER_IMAGE}" ]; then
  KIND_CLUSTER_OPTS="${KIND_CLUSTER_OPTS} --image ${KIND_CLUSTER_IMAGE}"
fi

kind_network='kind'
reg_name='kind-registry'
reg_port='5000'

# Check if the network exists
if ! podman network inspect $kind_network >/dev/null 2>&1; then
    # If the network doesn't exist, create it
    echo "Creating network $kind_network"
    podman network create --driver bridge $kind_network
else
    # If the network already exists, print a message
    echo "Network $kind_network already exists"
fi

# create registry container unless it already exists
running="$(podman inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)"
if [ "${running}" != 'true' ]; then
  if podman ps -a --format '{{.Names}}' | grep -q "^${reg_name}\$"; then
    # start the existing container
    podman start ${reg_name}
  else
    podman run \
    -d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" --net "$kind_network" \
    registry:2
  fi
fi


reg_host="${reg_name}"
if [ "${kind_network}" = "bridge" ]; then
    reg_host="$(podman inspect -f '{{.NetworkSettings.IPAddress}}' "${reg_name}")"
fi
echo "Registry Host: ${reg_host}"

# create a cluster with the local registry enabled in containerd
if [[ -z "${PROJECT_LOCAL_DATA_PATH}" ]]; then
  echo "PROJECT_LOCAL_DATA_PATH environment variable is not defined"
  # not sure what is the proper way to address it
  echo "Set it to some place outside of repo because of permissions issues"
  exit 1
fi
mkdir -p "$PROJECT_LOCAL_DATA_PATH"
mkdir -p "$PROJECT_LOCAL_DATA_PATH/postgres"
#chmod 776 "$PROJECT_LOCAL_DATA_PATH" "$PROJECT_LOCAL_DATA_PATH/postgres"
# Detect if running on Fedora
IS_FEDORA=false
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "fedora" ]]; then
        IS_FEDORA=true
    fi
fi

# Create the kind cluster configuration
KIND_CONFIG=$(cat <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:${reg_port}"]
    endpoint = ["http://${reg_host}:5000"]
nodes:
  - role: control-plane
    extraMounts:
      - hostPath: "${PROJECT_LOCAL_DATA_PATH}"
        containerPath: /data
        selinuxRelabel: true
      - hostPath: "$HOME/.docker/config.json"
        containerPath: /var/lib/kubelet/config.json
EOF
)

# Run kind create cluster with or without systemd-run based on OS
if [ "$IS_FEDORA" = true ]; then
    echo "$KIND_CONFIG" | systemd-run --scope --user kind create cluster ${KIND_CLUSTER_OPTS} --config=-
else
    echo "$KIND_CONFIG" | kind create cluster ${KIND_CLUSTER_OPTS} --config=-
fi

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${reg_port}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF
