-- Postgres version of the monitored server, e.g. "16.11 (Debian 16.11-1.pgdg13+1)"
SELECT current_setting('server_version') AS version;
