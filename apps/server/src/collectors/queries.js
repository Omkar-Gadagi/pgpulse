// Slow-query reads from pg_stat_statements.
//
// SQL injection safety:
//   - search text and queryId are bind parameters ($1, $3), never concatenated
//   - ORDER BY can't be a bind parameter in Postgres, so the client picks a KEY
//     and the actual SQL fragment comes from the SORTS whitelist below
import { targetQuery } from '../db/target.js';
import { loadSql } from '../sql/index.js';

const SLOW_QUERIES_SQL = loadSql('slow_queries');

/** Allowed sort keys → ORDER BY fragments. Anything else is rejected. */
export const SORTS = Object.freeze({
  total_time: 'total_exec_time DESC',
  mean_time: 'mean_exec_time DESC',
  calls: 'calls DESC',
});

export const DEFAULT_SORT = 'total_time';
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// Pre-build one SQL string per sort key at startup.
const ORDER_BY_PLACEHOLDER = '{{orderBy}}';
if (!SLOW_QUERIES_SQL.includes(`ORDER BY ${ORDER_BY_PLACEHOLDER}`)) {
  throw new Error(`slow_queries.sql must contain "ORDER BY ${ORDER_BY_PLACEHOLDER}"`);
}
const SQL_BY_SORT = Object.fromEntries(
  Object.entries(SORTS).map(([key, orderBy]) => [
    key,
    // replaceAll: the placeholder is also mentioned in the file's header comment
    SLOW_QUERIES_SQL.replaceAll(ORDER_BY_PLACEHOLDER, orderBy),
  ]),
);

/** Treat %, _ and \ in the user's search text literally inside ILIKE. */
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const ms = (value) => (value === null ? null : Math.round(Number(value) * 100) / 100);
const num = (value) => (value === null ? null : Number(value));

function toQuery(row) {
  const hit = num(row.shared_blks_hit);
  const read = num(row.shared_blks_read);
  return {
    queryId: row.query_id,
    query: row.query,
    calls: num(row.calls),
    totalExecTimeMs: ms(row.total_exec_time),
    meanExecTimeMs: ms(row.mean_exec_time),
    minExecTimeMs: ms(row.min_exec_time),
    maxExecTimeMs: ms(row.max_exec_time),
    rows: num(row.rows),
    sharedBlksHit: hit,
    sharedBlksRead: read,
    cacheHitRatio: hit + read === 0 ? null : Math.round((hit / (hit + read)) * 10000) / 10000,
    percentOfTotal: num(row.percent_of_total),
  };
}

/**
 * @param {{ sort?: keyof SORTS, limit?: number, search?: string|null }} opts
 */
export async function listQueries({ sort = DEFAULT_SORT, limit = DEFAULT_LIMIT, search = null } = {}) {
  const sql = SQL_BY_SORT[sort];
  if (!sql) throw new Error(`Invalid sort "${sort}"`);
  const pattern = search ? escapeLike(search) : null;
  const { rows } = await targetQuery(sql, [pattern, limit, null]);
  return {
    totalExecTimeMs: rows.length ? ms(rows[0].all_exec_time) : null,
    queries: rows.map(toQuery),
  };
}

/** One statement by queryid, or null if pg_stat_statements doesn't have it. */
export async function getQuery(queryId) {
  const { rows } = await targetQuery(SQL_BY_SORT[DEFAULT_SORT], [null, 1, queryId]);
  return rows.length ? toQuery(rows[0]) : null;
}
