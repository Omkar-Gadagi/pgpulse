// GET /api/health
// "Is the API up, and can it reach the monitored database?"
// Always answers 200 while the API process itself works: an unreachable target
// is reported in the body (targetReachable:false), not as a server error,
// so the UI can show a friendly "database unreachable" state.
import { Router } from 'express';
import { targetQuery } from '../db/target.js';
import { loadSql } from '../sql/index.js';
import { describeError } from '../lib/errors.js';

const SERVER_VERSION_SQL = loadSql('server_version');

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    const { rows } = await targetQuery(SERVER_VERSION_SQL);
    // "16.11 (Debian 16.11-1.pgdg13+1)" -> "16.11"
    const postgresVersion = String(rows[0].version).split(' ')[0];
    res.json({ ok: true, targetReachable: true, postgresVersion });
  } catch (err) {
    res.json({
      ok: true,
      targetReachable: false,
      postgresVersion: null,
      error: describeError(err),
    });
  }
});
