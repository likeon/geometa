\set AUTOCOMMIT on
drop database if exists geometa_backup;

-- drop all connections to the db
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'geometa'
  AND pid <> pg_backend_pid();

create database geometa_backup with template geometa;
