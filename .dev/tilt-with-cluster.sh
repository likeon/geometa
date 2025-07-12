#!/bin/bash

set -e

# Function to be executed when the script is started
start_sequence() {
    echo "Starting script..."
    bash ./.dev/kind-with-registry.sh
    tilt up
}

# Function to be executed when the script is stopped
stop_sequence() {
    kind delete cluster
    exit 0
}

# Trap the Ctrl+C signal and call the stop_sequence function
trap stop_sequence SIGINT

# Call the start_sequence function
start_sequence
