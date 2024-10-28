#!/bin/bash
DROP_STATEMENTS=$(turso db shell http://localhost:8080/ "
  SELECT
    CASE
      WHEN type = 'table' THEN 'DROP TABLE IF EXISTS ' || quote(name) || ';'
      WHEN type = 'view' THEN 'DROP VIEW IF EXISTS ' || quote(name) || ';'
    END
  FROM sqlite_master
  WHERE type IN ('table', 'view');
" | grep -E '^(DROP TABLE|DROP VIEW)')

turso db shell http://localhost:8080/ <<EOF
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
$DROP_STATEMENTS
COMMIT;
PRAGMA foreign_keys = ON;
EOF
