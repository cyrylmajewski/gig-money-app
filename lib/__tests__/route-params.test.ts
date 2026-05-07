import { describe, expect, it } from 'vitest';
import { parseJsonParam } from '@/lib/route-params';

describe('parseJsonParam', () => {
  it('parses valid JSON string params', () => {
    expect(parseJsonParam<{ ok: boolean }>('{"ok":true}', { ok: false })).toEqual({
      ok: true,
    });
  });

  it('returns fallback for invalid JSON', () => {
    expect(parseJsonParam('not-json', { safe: true })).toEqual({ safe: true });
  });

  it('returns fallback for missing params', () => {
    expect(parseJsonParam(undefined, [])).toEqual([]);
  });

  it('returns fallback for array params', () => {
    expect(parseJsonParam(['{"ok":true}'], { ok: false })).toEqual({
      ok: false,
    });
  });
});
