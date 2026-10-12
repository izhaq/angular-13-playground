import { DEFAULT_CAPTURE_POLICY } from '../contract';
import { matchesAny, redactHeaders, redactJsonText, redactJsonValue } from './redact';

describe('redact', () => {
  const R = '[redacted]';

  it('redacts header values case-insensitively and lower-cases keys', () => {
    const headers = { Authorization: 'Bearer abc', 'Content-Type': 'application/json', COOKIE: 'sid=1' };

    const result = redactHeaders(headers, ['authorization', 'Cookie'], R);

    expect(result).toEqual({ authorization: R, 'content-type': 'application/json', cookie: R });
    expect(result).not.toBe(headers);
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('redacts nested JSON keys at any depth, including inside arrays', () => {
    const value = {
      user: { name: 'op', Password: 'p1' },
      sessions: [{ token: 't1', id: 1 }, [{ deeper: { TOKEN: { any: 'shape' } } }]],
      secret: null,
    };

    // Typed `unknown`: Jasmine's `Expected<T>` recursion blows up on the recursive `JsonValue` type.
    const redacted: unknown = redactJsonValue(value, ['password', 'token', 'secret'], R);

    expect(redacted).toEqual({
      user: { name: 'op', Password: R },
      sessions: [{ token: R, id: 1 }, [{ deeper: { TOKEN: R } }]],
      secret: R,
    });
    // The input is not mutated.
    expect(value.user.Password).toBe('p1');
  });

  it('leaves non-JSON text untouched', () => {
    const keys = ['password'];
    expect(redactJsonText('password=s3cret', keys, R)).toBe('password=s3cret');
    expect(redactJsonText('{"password": broken', keys, R)).toBe('{"password": broken');
    expect(redactJsonText('', keys, R)).toBe('');
    expect(redactJsonText('<html>password</html>', keys, R)).toBe('<html>password</html>');
  });

  it('leaves JSON primitives untouched', () => {
    const keys = ['password'];
    expect(redactJsonText('"password"', keys, R)).toBe('"password"');
    expect(redactJsonText('42', keys, R)).toBe('42');
    expect(redactJsonText('null', keys, R)).toBe('null');
  });

  it('redacts the login request body\'s password', () => {
    const body = '{"username":"op","password":"s3cret","mode":"operation","position":"active"}';

    const result = redactJsonText(body, DEFAULT_CAPTURE_POLICY.redactJsonKeys, R);

    expect(result).toBe('{"username":"op","password":"[redacted]","mode":"operation","position":"active"}');
    expect(result).not.toContain('s3cret');
  });

  it('redacts JSON text with leading whitespace and inside a top-level array', () => {
    expect(redactJsonText('  \n[{"token":"t"}]', ['token'], R)).toBe('[{"token":"[redacted]"}]');
  });

  it('keeps JSON text byte-for-byte when no key matches', () => {
    const pretty = '{\n  "a": 1\n}';
    expect(redactJsonText(pretty, ['password'], R)).toBe(pretty);
  });

  it('matchesAny is stable with global regexes', () => {
    const patterns = [/\/never/, /\/api\/stream/g];
    const url = 'http://localhost/api/stream';

    const results = [1, 2, 3, 4].map(() => matchesAny(url, patterns));

    expect(results).toEqual([true, true, true, true]);
    expect(matchesAny('http://localhost/other', patterns)).toBeFalse();
    expect(matchesAny(url, [])).toBeFalse();
    const sticky = /http/y;
    expect([1, 2, 3].map(() => matchesAny(url, [sticky]))).toEqual([true, true, true]);
  });
});
