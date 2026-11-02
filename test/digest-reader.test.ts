import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-digest-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl into one row per job', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    if (night === null) return;
    expect(night.night).toBe('2026-10-28');
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const byJob = new Map(night.rows.map((r) => [r.job, r]));
    expect(byJob.get('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob.get('notes/backup')?.lastStatus).toBe('fail');
    expect(byJob.get('notes/backup')?.lastError).toBe('quota exceeded');
    expect(byJob.get('digest/render')?.owner).toBeNull();
    expect(byJob.get('lane/sync')?.firstAt).toBe('2026-10-28T23:00:06+01:00');
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('returns null for a name that is not YYYY-MM-DD', () => {
    expect(readNight('runs', '../x')).toBeNull();
    expect(readNight('runs', '2026-10-28.jsonl')).toBeNull();
  });

  it('gives no rows for an empty file', () => {
    writeFileSync(join(tmp, '2026-01-01.jsonl'), '');
    expect(readNight(tmp, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('counts bad and off-shape lines, skips blank ones', () => {
    const lines = [
      '{"at":"2026-01-02T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
      '',
      '{not json',
      '{"at":"x","job":"a","status":"maybe","owner":"rook"}',
      '{"at":"x","job":"a","status":"ok","owner":7}',
      '{"at":"x","job":"a","status":"ok","owner":null,"error":5}',
      '[]',
      '   ',
    ];
    writeFileSync(join(tmp, '2026-01-02.jsonl'), lines.join('\n'));
    const night = readNight(tmp, '2026-01-02');
    expect(night?.badLines).toBe(5);
    expect(night?.rows).toHaveLength(1);
    expect(night?.rows[0]?.runs).toBe(1);
    expect(night?.rows[0]?.lastError).toBeNull();
  });
});
