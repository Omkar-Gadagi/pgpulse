# pgPulse

**Live PostgreSQL health and performance dashboard.** Point it at a Postgres database and see connections, transactions per second, cache hit ratio, database size, the longest running query and the slowest queries, updating in real time.

> 🚧 **Work in progress.** Built in public, one step at a time. See the roadmap below.

## Why

When an app slows down, the cause is very often the database: one expensive query, a missing index, a query stuck waiting on a lock. Postgres records all of this in its built-in statistics views (`pg_stat_activity`, `pg_stat_database`, `pg_stat_statements`, ...), but reading them means knowing the right SQL. pgPulse reads those views **read-only** and turns them into a clear, live dashboard.

## Planned features (v0.1)

- **Live dashboard** over WebSockets: active connections, TPS, cache hit ratio, database size, longest running query
- **Slow queries page**: search and sort `pg_stat_statements`, with a detail view per query
- **Metric history** stored in pgPulse's own database, so charts show the last hour on load
- **One-command demo**: `docker compose up` starts Postgres with generated traffic and deliberately slow queries
- **Safe by design**: connects with a dedicated read-only role (`pg_monitor`), with a statement timeout

## Architecture

```
Browser (React + TypeScript)
  │  REST  /api/*        queries, history, health
  │  Socket.IO           live dashboard metrics
  ▼
Node.js server (Express + Socket.IO)
  ├── read-only pool ─► monitored Postgres (pg_stat_* views)
  └── app pool ───────► pgPulse's own Postgres (metric history)
```

## Tech stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Highcharts, Socket.IO, Node.js, Express, PostgreSQL 16, Docker Compose.



## License

[MIT](LICENSE).

Charts use [Highcharts](https://www.highcharts.com/), which is free for non-commercial use; commercial use requires a Highcharts licence.
