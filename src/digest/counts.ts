import type { Night, RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// Jobs of a night by their last status. null when the night can't be read.
export function countByLastStatus(night: Night | null): StatusCounts | null {
  if (!night) return null;
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of night.rows) counts[row.lastStatus] += 1;
  return counts;
}
