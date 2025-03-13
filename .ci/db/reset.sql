\set AUTOCOMMIT on
drop database if exists geometa with ( force );

create database geometa with template geometa_backup;
