import { describe, expect, it } from 'vitest';

import { diagnoseChunk } from '../src/eslint/diagnose.js';

describe('diagnoseChunk', () => {
  it('refuses to invent a diagnosis for a chunk that already matches its rendering', () => {
    expect(() =>
      diagnoseChunk(
        { entries: [], start: 12, end: 12, text: '', restOfLine: '' },
        {
          text: '',
          order: [],
          separators: [],
          missingComments: new Map(),
          strayComments: new Map(),
          rewrittenComments: new Set(),
        }
      )
    ).toThrow(/offset 12/u);
  });
});
