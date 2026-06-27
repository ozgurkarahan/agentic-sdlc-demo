import { describe, expect, it } from 'vitest';
import { LinkStore } from '../../src/store/linkStore.js';

describe('LinkStore', () => {
  it('creates and reads links with zero hits', () => {
    const store = new LinkStore();

    const created = store.create('abc123', 'https://example.com');

    expect(created).toEqual({ code: 'abc123', url: 'https://example.com', hits: 0 });
    expect(store.get('abc123')).toEqual(created);
  });

  it('increments hits for known links', () => {
    const store = new LinkStore();
    store.create('abc123', 'https://example.com');

    expect(store.incrementHits('abc123')).toEqual({
      code: 'abc123',
      url: 'https://example.com',
      hits: 1,
    });
  });

  it('lists links without exposing mutable store internals', () => {
    const store = new LinkStore();
    const created = store.create('abc123', 'https://example.com');
    const listed = store.list();

    listed[0]!.hits = 99;

    expect(created.hits).toBe(0);
    expect(store.get('abc123')!.hits).toBe(0);
  });

  it('rejects duplicate codes', () => {
    const store = new LinkStore();
    store.create('abc123', 'https://example.com');

    expect(() => store.create('abc123', 'https://example.org')).toThrow('Link code already exists: abc123');
  });
});
