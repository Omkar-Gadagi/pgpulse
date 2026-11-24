// GET /api/queries?sort=total_time&limit=50&search=orders
// GET /api/queries/:queryId
// Input is validated here; queries.js only ever receives safe values.
import { Router } from 'express';
import {
  SORTS,
  DEFAULT_SORT,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  listQueries,
  getQuery,
} from '../collectors/queries.js';
import { describeError } from '../lib/errors.js';

const MAX_SEARCH_LENGTH = 200;
// pg_stat_statements queryid is a signed 64-bit integer
const QUERY_ID_PATTERN = /^-?\d{1,20}$/;

const BIGINT_MIN = -(2n ** 63n);
const BIGINT_MAX = 2n ** 63n - 1n;
const fitsInBigint = (text) => {
  const value = BigInt(text);
  return value >= BIGINT_MIN && value <= BIGINT_MAX;
};

export const queriesRouter = Router();

function unavailable(res, err) {
  // Most likely causes: target down, or pg_stat_statements not installed.
  res.status(503).json({ error: 'Could not read pg_stat_statements', detail: describeError(err) });
}

queriesRouter.get('/queries', async (req, res) => {
  const sort = req.query.sort ?? DEFAULT_SORT;
  if (!Object.hasOwn(SORTS, sort)) {
    return res
      .status(400)
      .json({ error: `Invalid sort "${sort}"`, allowed: Object.keys(SORTS) });
  }

  let limit = DEFAULT_LIMIT;
  if (req.query.limit !== undefined) {
    limit = Number.parseInt(req.query.limit, 10);
    if (Number.isNaN(limit)) {
      return res.status(400).json({ error: 'limit must be an integer' });
    }
    limit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  }

  const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (rawSearch.length > MAX_SEARCH_LENGTH) {
    return res.status(400).json({ error: `search must be at most ${MAX_SEARCH_LENGTH} characters` });
  }
  const search = rawSearch || null;

  try {
    const result = await listQueries({ sort, limit, search });
    res.json({ sort, limit, search, ...result });
  } catch (err) {
    unavailable(res, err);
  }
});

queriesRouter.get('/queries/:queryId', async (req, res) => {
  const { queryId } = req.params;
  if (!QUERY_ID_PATTERN.test(queryId) || !fitsInBigint(queryId)) {
    return res.status(400).json({ error: 'queryId must be a 64-bit integer' });
  }

  try {
    const query = await getQuery(queryId);
    if (!query) return res.status(404).json({ error: 'Query not found' });
    res.json(query);
  } catch (err) {
    unavailable(res, err);
  }
});
