// Plan morning-digest § 1. The contract every part of § 2 builds against: one row per job for a
// night, read from runs/<night>.jsonl.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of the run log, once parsed.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

export type DigestRow = {
  job: string;
  // Owner on the job's last line. null renders as `—`.
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  // Error of the most recent line that had one, or null.
  lastError: string | null;
  // Times as in the log, offset kept.
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  // Sorted by job, so the page and the JSON list them in the same order.
  rows: DigestRow[];
  // Lines that didn't parse. Counted, never thrown.
  badLines: number;
};

// null when the night has no file (or isn't a YYYY-MM-DD name). An empty file gives rows: [].
export type ReadNight = (runsDir: string, night: string) => Night | null;
