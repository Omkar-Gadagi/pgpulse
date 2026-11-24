-- Total on-disk size of the monitored database, in bytes.
SELECT pg_database_size(current_database()) AS bytes;
