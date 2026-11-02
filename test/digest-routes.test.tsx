import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';
import type { Night } from '../src/digest/types.js';

const base: RigConfig = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: 'runs',
};

const lines = (...rows: string[]) => rows.join('\n') + '\n';

const ok = (at: string, job: string, owner: string) =>
  JSON.stringify({ at, job, status: 'ok', owner });

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-routes-'));
  fs.writeFileSync(
    path.join(runsDir, '2026-10-01.jsonl'),
    lines(
      ok('2026-10-01T02:00:00+02:00', 'b/job', 'ops'),
      ok('2026-10-01T02:05:00+02:00', 'a/job', 'ops'),
    ),
  );
  fs.writeFileSync(path.join(runsDir, '2026-10-02.jsonl'), '');
  fs.writeFileSync(
    path.join(runsDir, '2026-10-03.jsonl'),
    lines(ok('2026-10-03T02:00:00+02:00', 'a/job', 'ops'), '{not json'),
  );
  app = createApp({ ...base, runsDir });
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('lists every job of the night', async () => {
    const res = await app.request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
  });

  it('lists jobs in the same order as the JSON', async () => {
    const html = await (await app.request('/digest/2026-10-01')).text();
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
  });

  it('is 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-09-30');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('renders a night with a bad line', async () => {
    const res = await app.request('/digest/2026-10-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('a/job');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the rows sorted by job', async () => {
    const res = await app.request('/api/digest/2026-10-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-10-01');
    expect(body.rows.map((row) => row.job)).toEqual(['a/job', 'b/job']);
  });

  it('is 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-09-30');
    expect(res.status).toBe(404);
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-10-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
  });

  it('counts the bad lines of a night', async () => {
    const res = await app.request('/api/digest/2026-10-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
  });
});
