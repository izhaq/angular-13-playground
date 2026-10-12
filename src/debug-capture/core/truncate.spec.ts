import { truncate } from './truncate';

describe('truncate', () => {
  it('leaves short text unchanged', () => {
    expect(truncate('abc', 3)).toBe('abc');
    expect(truncate('abc', 10)).toBe('abc');
    expect(truncate('', 0)).toBe('');
  });

  it('truncates and reports the removed count', () => {
    expect(truncate('abcdefghij', 4)).toBe('abcd…[truncated 6 chars]');
    expect(truncate('abc', 0)).toBe('…[truncated 3 chars]');
  });
});
