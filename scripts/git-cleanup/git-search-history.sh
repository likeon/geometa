#!/usr/bin/env bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 <search_string>" >&2
    exit 1
fi

search_string="$1"

cd /home/likeon/Devel/geometa-web-mirror
repo_root=$(git rev-parse --show-toplevel)

git log --all --full-history -S "$search_string" --name-only --pretty=format: | \
sort | uniq | grep -v '^$' | \
while read -r file; do
    if [ -e "$repo_root/$file" ]; then
        echo "$file:true"
    else
        echo "$file:false"
    fi
done | \
jq -R -s 'split("\n") | map(select(. != "")) | map(split(":") | {file: .[0], exists: (.[1] == "true")})'
