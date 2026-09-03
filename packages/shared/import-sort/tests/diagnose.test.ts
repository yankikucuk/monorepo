import { describe, expect, it } from 'vitest';

import { diagnoseChunk } from '../src/eslint/diagnose.js';

describe('diagnoseChunk', () => {
  it('refuses to invent a diagnosis for a chunk that already matches its rendering', () => {
    expect(() =>
      diagnoseChunk({ entries: [], start: 12, end: 12, text: '' }, { text: '', order: [], separators: [] })
    ).toThrow(/offset 12/u);
  });
});
