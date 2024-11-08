#!/bin/bash
OUTPUT_FILE=".ci/db/dump.sql"

# Send a GET request to the URL and save the response body to the output file
curl -X GET -H "Authorization: Bearer $TURSO_AUTH_TOKEN" "${TURSO_DATABASE_URL%/}/dump" -o "$OUTPUT_FILE"
