import { describe, expect, it } from 'vitest';
import { BASE62_ALPHABET, generateCode } from '../../src/code.js';

describe('generateCode', () => {
  it('generates a six-character base62 code by default', () => {
    const code = generateCode();

    expect(code).toMatch(/^[0-9A-Za-z]{6}$/);
  });

  it('supports deterministic random indexes for tests', () => {
    let next = 0;
    const code = generateCode(4, (maxExclusive) => {
      const value = next % maxExclusive;
      next += 1;
      return value;
    });

    expect(code).toBe(BASE62_ALPHABET.slice(0, 4));
  });

  it('rejects invalid code lengths', () => {
    expect(() => generateCode(0)).toThrow('Code length must be a positive integer');
  });
});
