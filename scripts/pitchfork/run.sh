#!/usr/bin/env bash

trap 'pitchfork stop -l' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

pitchfork logs 00-info --clear
pitchfork start --group minimal >/dev/null 2>&1 &
pitchfork tui --project
