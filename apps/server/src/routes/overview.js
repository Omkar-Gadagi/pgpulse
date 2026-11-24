// GET /api/overview — the current dashboard snapshot (same shape as metrics:update).
// If the live collector is running, its latest snapshot is reused, so this
// endpoint adds no extra load. Otherwise it reads the stats on demand.
import { Router } from 'express';
import { readOverview } from '../collectors/overview.js';
import { describeError } from '../lib/errors.js';

export function createOverviewRouter(collector) {
  const router = Router();

  router.get('/overview', async (_req, res) => {
    const cached = collector.latestFresh();
    if (cached) return res.json(cached);

    try {
      res.json(await readOverview());
    } catch (err) {
      res.status(503).json({ error: 'Target database unreachable', detail: describeError(err) });
    }
  });

  return router;
}
