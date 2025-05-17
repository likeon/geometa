SELECT 'DROP TABLE IF EXISTS "' || name || '";' AS stmt
FROM sqlite_master
WHERE type = 'table';
