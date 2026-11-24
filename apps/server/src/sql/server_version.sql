-- Postgres version and name of the monitored database,
-- e.g. version "16.11 (Debian 16.11-1.pgdg13+1)", database "demo_shop"
SELECT current_setting('server_version') AS version,
       current_database()                AS database;
