#!/bin/bash
# ─────────────────────────────────────────────────────────────
# pgPulse load generator
# Keeps the demo_shop database busy so the dashboard always has
# something to show:
#   1. pgbench       → steady OLTP traffic (TPS, connections, cache hits)
#   2. slow queries  → seq scans on a 500k-row table with NO index,
#                      so the Queries page has real "slowest queries"
#   3. long sleeps   → occasional long-running query for the
#                      "Longest query" KPI (amber/red thresholds)
# Connection details come from PGHOST / PGUSER / PGPASSWORD / PGDATABASE.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

DB="${PGDATABASE:-demo_shop}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

# Stop all background loops cleanly on `docker compose down` / Ctrl+C.
# (bash as PID 1 ignores SIGTERM unless it is trapped.)
trap 'echo "[loadgen] stopping"; kill 0; exit 0' TERM INT

log() { echo "[loadgen] $(date +%H:%M:%S) $*"; }

# ── 1. Wait for Postgres ─────────────────────────────────────
until pg_isready -q -d "$DB"; do
  log "waiting for postgres..."
  sleep 2
done
log "postgres is ready"

# ── 2. pgbench schema (only the first time) ──────────────────
# Scale 10 = 1,000,000 rows in pgbench_accounts (~150 MB).
if ! "${PSQL[@]}" -tAc "SELECT to_regclass('public.pgbench_accounts')" | grep -q pgbench_accounts; then
  log "initialising pgbench (scale 10)..."
  pgbench -i -s 10 -q "$DB"
else
  log "pgbench tables already exist, skipping init"
fi

# ── 3. Un-indexed table for slow queries (only the first time) ─
"${PSQL[@]}" <<'SQL'
CREATE TABLE IF NOT EXISTS orders_archive (
  order_id     BIGINT,
  customer_id  INT,
  status       TEXT,
  amount       NUMERIC(10,2),
  note         TEXT,
  created_at   TIMESTAMPTZ
);
-- Deliberately NO primary key and NO indexes.

INSERT INTO orders_archive
SELECT g,
       (random() * 20000)::int,
       (ARRAY['pending','paid','shipped','refunded','cancelled'])[1 + (random() * 4)::int],
       round((random() * 500)::numeric, 2),
       md5(g::text) || CASE WHEN random() < 0.02 THEN ' refund requested' ELSE '' END,
       now() - (random() * interval '365 days')
FROM generate_series(1, 500000) AS g
WHERE NOT EXISTS (SELECT 1 FROM orders_archive LIMIT 1);

ANALYZE orders_archive;

-- One hot row that the lock-conflict loop fights over
CREATE TABLE IF NOT EXISTS lock_demo (id INT PRIMARY KEY, val INT NOT NULL);
INSERT INTO lock_demo VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
SQL
log "orders_archive ready ($("${PSQL[@]}" -tAc 'SELECT count(*) FROM orders_archive') rows)"

# ── 4. Steady OLTP traffic: pgbench in 5-minute rounds ───────
pgbench_loop() {
  while true; do
    log "pgbench round: 5 clients, 2 threads, 300s"
    pgbench -c 5 -j 2 -T 300 -n "$DB" > /dev/null 2>&1 || log "pgbench round failed, retrying"
    sleep 2
  done
}

# ── 5. Deliberately slow queries every few seconds ───────────
slow_query_loop() {
  while true; do
    cid=$((RANDOM % 20000))
    PGAPPNAME=loadgen-slow-queries "${PSQL[@]}" > /dev/null <<SQL
-- full scan: filter on un-indexed column
SELECT * FROM orders_archive WHERE customer_id = ${cid};

-- full scan + aggregate + sort
SELECT customer_id, count(*) AS orders, sum(amount) AS revenue
FROM orders_archive
GROUP BY customer_id
ORDER BY revenue DESC
LIMIT 10;

-- full scan with a leading-wildcard text search (can never use a b-tree)
SELECT count(*) FROM orders_archive WHERE note ILIKE '%refund%';

-- full sort of 500k rows to get the latest 50
SELECT order_id, status, amount, created_at
FROM orders_archive
ORDER BY created_at DESC
LIMIT 50;
SQL
    sleep $((3 + RANDOM % 5))
  done
}

# ── 6. Occasional long-running query (3–40 s) ────────────────
long_query_loop() {
  while true; do
    sleep $((20 + RANDOM % 40))
    secs=$((3 + RANDOM % 38))
    log "long-running query: pg_sleep(${secs})"
    PGAPPNAME=loadgen-long-query "${PSQL[@]}" -c "SELECT pg_sleep(${secs});" > /dev/null
  done
}

# ── 7. Lock conflict every 30–60 s (for Activity & Locks) ────
# The classic production incident: a client opens a transaction, updates a
# row, then goes off to do something else without committing. Postgres shows
# it as "idle in transaction", and it keeps holding the row lock, so every
# other writer to that row queues up behind it.
#   holder   UPDATE row 1, then idle in transaction for 20 s
#   waiter 1 UPDATE row 1 → blocked by holder
#   waiter 2 UPDATE row 1 → blocked by holder and waiter 1 (a chain)
lock_conflict_loop() {
  while true; do
    sleep $((30 + RANDOM % 30))
    log "lock conflict: holder idle in transaction for 20s, 2 waiters queued behind it"

    # \! runs a shell command INSIDE psql while the transaction stays open, so
    # the backend sits in "idle in transaction" holding the row lock.
    PGAPPNAME=loadgen-lock-holder "${PSQL[@]}" > /dev/null <<'SQL' &
BEGIN;
UPDATE lock_demo SET val = val + 1 WHERE id = 1;
\! sleep 20
COMMIT;
SQL
    sleep 2
    PGAPPNAME=loadgen-lock-waiter "${PSQL[@]}" -c "UPDATE lock_demo SET val = val + 1 WHERE id = 1;" > /dev/null &
    sleep 1
    PGAPPNAME=loadgen-lock-waiter "${PSQL[@]}" -c "UPDATE lock_demo SET val = val - 1 WHERE id = 1;" > /dev/null &
    # wait only for this round's three sessions (this function runs in its own subshell)
    wait
  done
}

pgbench_loop &
slow_query_loop &
long_query_loop &
lock_conflict_loop &
log "load generator running"

# Keep PID 1 alive; `wait` returns immediately when a trapped signal arrives.
wait
