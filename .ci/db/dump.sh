#!/bin/bash
URL="http://localhost:8080/dump"
OUTPUT_FILE=".ci/db/dump.sql"

# Send a GET request to the URL and save the response body to the output file
curl -X GET "$URL" -o "$OUTPUT_FILE"
