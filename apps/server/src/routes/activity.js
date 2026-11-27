// GET /api/activity — current sessions and who blocks whom.
// Polled by the Activity & Locks page every few seconds.
import { Router } from 'express';
import { readActivity } from '../collectors/activity.js';
import { describeError } from '../lib/errors.js';

export const activityRouter = Router();

activityRouter.get('/activity', async (_req, res) => {
  try {
    res.json(await readActivity());
  } catch (err) {
    res.status(503).json({ error: 'Could not read pg_stat_activity', detail: describeError(err) });
  }
});
