#!/bin/bash
# Runs once, on the very first start of the Postgres container (empty data volume).
# It only exists to pass the reader password from the environment into init.sql
# as a psql variable, so no password is hard-coded in SQL.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  -v reader_user="$READER_USER" \
  -v reader_password="$READER_PASSWORD" \
  -f /pgpulse/init.sql
