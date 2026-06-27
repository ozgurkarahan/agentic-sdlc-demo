import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../src/config.js';

describe('parseConfig', () => {
  it('uses safe defaults when env vars are absent', () => {
    expect(parseConfig({})).toEqual({
      port: 3000,
      baseUrl: 'http://localhost:3000',
    });
  });

  it('reads configured values from the environment', () => {
    expect(parseConfig({ PORT: '8080', BASE_URL: 'https://short.example' })).toEqual({
      port: 8080,
      baseUrl: 'https://short.example',
    });
  });

  it('falls back to safe defaults when configured values are invalid', () => {
    expect(parseConfig({ PORT: 'not-a-port', BASE_URL: '/' })).toEqual({
      port: 3000,
      baseUrl: 'http://localhost:3000',
    });
  });
});

