import { CaptureEntry, CapturePolicy, EntryDraft, ErrorEntry, HttpEntry, LogEntry, WebSocketEntry } from '../contract';
import { resolvePolicy } from './policy';
import { createRecorder } from './recorder';

type HttpDraft = Omit<HttpEntry, 'seq'>;
type WsDraft = Omit<WebSocketEntry, 'seq'>;

function httpDraft(overrides: Partial<HttpDraft> = {}): HttpDraft {
  return {
    kind: 'http',
    t: 1,
    transport: 'xhr',
    method: 'get',
    url: 'http://localhost/api/items',
    status: 200,
    durationMs: 5,
    reqHeaders: {},
    resHeaders: {},
    reqBody: null,
    resBody: null,
    bytes: 0,
    error: null,
    ...overrides,
  };
}

function wsDraft(overrides: Partial<WsDraft> = {}): WsDraft {
  return {
    kind: 'ws',
    t: 1,
    socketId: 1,
    url: 'ws://localhost/stream',
    event: 'receive',
    opcode: 'text',
    bytes: 2,
    data: '{}',
    code: null,
    ...overrides,
  };
}

function logDraft(...args: unknown[]): EntryDraft {
  return { kind: 'log', t: 1, level: 'log', args };
}

/** `unknown`, because Jasmine's `Expected<T>` recursion blows up on the recursive `JsonValue` type. */
function argsOf(entry: CaptureEntry): readonly unknown[] {
  return (entry as LogEntry).args;
}

function recorderWith(overrides: Partial<CapturePolicy> = {}): ReturnType<typeof createRecorder> {
  return createRecorder(resolvePolicy(overrides));
}

describe('createRecorder', () => {
  it('assigns seq from 1 and never reuses it after clear', () => {
    const recorder = recorderWith();
    recorder.record(logDraft('a'));
    recorder.record(logDraft('b'));

    expect(recorder.snapshot().map((e) => e.seq)).toEqual([1, 2]);

    recorder.clear();
    recorder.record(logDraft('c'));

    expect(recorder.snapshot().map((e) => e.seq)).toEqual([3]);
  });

  it('stores a frozen entry with the draft fields', () => {
    const recorder = recorderWith();
    recorder.record({ kind: 'error', t: 7, source: 'window', message: 'm', stack: null });

    const [entry] = recorder.snapshot();
    expect(entry).toEqual({ kind: 'error', seq: 1, t: 7, source: 'window', message: 'm', stack: null });
    expect(Object.isFrozen(entry)).toBeTrue();
  });

  it('drops ignored URLs and counts them', () => {
    const recorder = recorderWith({ ignoreUrls: [/\/health/g] });

    recorder.record(httpDraft({ url: 'http://localhost/health' }));
    recorder.record(httpDraft({ url: 'http://localhost/health' }));
    recorder.record(wsDraft({ url: 'ws://localhost/health' }));
    recorder.record(httpDraft());

    expect(recorder.snapshot().map((e) => (e as HttpEntry).url)).toEqual(['http://localhost/api/items']);
    expect(recorder.stats()).toEqual({ recorded: 1, dropped: 3, evicted: 0, failed: 0 });
  });

  it('drops drafts the sampler rejects', () => {
    const seen: EntryDraft[] = [];
    const recorder = recorderWith({
      sample: (draft) => {
        seen.push(draft);
        return draft.kind !== 'ws';
      },
    });

    recorder.record(wsDraft());
    recorder.record(logDraft('kept'));

    expect(seen.length).toBe(2);
    expect(recorder.snapshot().map((e) => e.kind)).toEqual(['log']);
    expect(recorder.stats()).toEqual({ recorded: 1, dropped: 1, evicted: 0, failed: 0 });
  });

  it('keeps the draft and counts a failure when the sampler throws', () => {
    const recorder = recorderWith({
      sample: () => {
        throw new Error('buggy sampler');
      },
    });

    recorder.record(logDraft('still here'));

    expect(argsOf(recorder.snapshot()[0])).toEqual(['still here']);
    expect(recorder.stats()).toEqual({ recorded: 1, dropped: 0, evicted: 0, failed: 1 });
  });

  it('redacts headers before storing', () => {
    const recorder = recorderWith();

    recorder.record(
      httpDraft({
        reqHeaders: { Authorization: 'Bearer abc', Accept: 'application/json' },
        resHeaders: { 'Set-Cookie': 'sid=1' },
      }),
    );

    const entry = recorder.snapshot()[0] as HttpEntry;
    expect(entry.reqHeaders).toEqual({ authorization: '[redacted]', accept: 'application/json' });
    expect(entry.resHeaders).toEqual({ 'set-cookie': '[redacted]' });
    expect(entry.method).toBe('GET');
  });

  it('redacts JSON body keys before storing', () => {
    const recorder = recorderWith();

    recorder.record(
      httpDraft({
        method: 'post',
        url: 'http://localhost/api/auth/login',
        reqBody: '{"username":"op","password":"s3cret","mode":"operation","position":"active"}',
        resBody: '{"accessToken":"a.b.c","user":{"name":"op"}}',
      }),
    );
    recorder.record(wsDraft({ data: '{"type":"auth","token":"t0k"}' }));
    recorder.record(logDraft('login', { password: 's3cret', nested: [{ apiKey: 'k' }] }));

    const [http, ws, log] = recorder.snapshot() as [HttpEntry, WebSocketEntry, LogEntry];
    expect(http.reqBody).toBe('{"username":"op","password":"[redacted]","mode":"operation","position":"active"}');
    expect(http.resBody).toBe('{"accessToken":"[redacted]","user":{"name":"op"}}');
    expect(ws.data).toBe('{"type":"auth","token":"[redacted]"}');
    expect(argsOf(log)).toEqual(['login', { password: '[redacted]', nested: [{ apiKey: '[redacted]' }] }]);
    expect(JSON.stringify(recorder.snapshot())).not.toContain('s3cret');
  });

  it('replaces bodies whole for redactBodyUrls', () => {
    const recorder = recorderWith({ redactBodyUrls: [/\/secure\//] });

    recorder.record(httpDraft({ url: 'http://localhost/secure/x', reqBody: 'plain', resBody: '{"a":1}' }));
    recorder.record(wsDraft({ url: 'ws://localhost/secure/feed', opcode: 'binary', data: 'AAEC' }));
    recorder.record(httpDraft({ url: 'http://localhost/secure/y', reqBody: null }));
    recorder.record(httpDraft({ url: 'http://localhost/open', reqBody: 'plain' }));

    const [secureHttp, secureWs, emptyBody, open] = recorder.snapshot() as [
      HttpEntry,
      WebSocketEntry,
      HttpEntry,
      HttpEntry,
    ];
    expect(secureHttp.reqBody).toBe('[redacted]');
    expect(secureHttp.resBody).toBe('[redacted]');
    expect(secureWs.data).toBe('[redacted]');
    expect(emptyBody.reqBody).toBeNull();
    expect(open.reqBody).toBe('plain');
  });

  it('truncates bodies, frame data, messages and stacks', () => {
    const recorder = recorderWith({ maxBodyLength: 4 });

    recorder.record(httpDraft({ reqBody: 'abcdef', resBody: '[1,2,3]' }));
    recorder.record(wsDraft({ opcode: 'text', data: 'hello' }));
    recorder.record(wsDraft({ opcode: 'binary', data: 'QUJDREVG' }));
    recorder.record(wsDraft({ event: 'close', opcode: null, data: 'going away', code: 1001 }));
    recorder.record({ kind: 'error', t: 1, source: 'window', message: 'long message', stack: 'at a\nat b' });

    const [http, text, binary, close, error] = recorder.snapshot() as [
      HttpEntry,
      WebSocketEntry,
      WebSocketEntry,
      WebSocketEntry,
      ErrorEntry,
    ];
    expect(http.reqBody).toBe('abcd…[truncated 2 chars]');
    expect(http.resBody).toBe('[1,2…[truncated 3 chars]');
    expect(text.data).toBe('hell…[truncated 1 chars]');
    expect(binary.data).toBe('QUJD…[truncated 4 chars]');
    expect(close.data).toBe('goin…[truncated 6 chars]');
    expect(error.message).toBe('long…[truncated 8 chars]');
    expect(error.stack).toBe('at a…[truncated 5 chars]');
  });

  it('clones log args so later mutation does not change the entry', () => {
    const recorder = recorderWith();
    const live = { count: 1, list: [1] };

    recorder.record(logDraft(live, new Date(0)));
    live.count = 2;
    live.list.push(2);

    expect(argsOf(recorder.snapshot()[0])).toEqual([{ count: 1, list: [1] }, '1970-01-01T00:00:00.000Z']);
  });

  it('clones log args only down to maxArgDepth', () => {
    const recorder = recorderWith({ maxArgDepth: 1 });

    recorder.record(logDraft({ a: { b: 1 } }));

    expect(argsOf(recorder.snapshot()[0])).toEqual([{ a: '[Object]' }]);
  });

  it('evicts beyond maxEntries and counts evictions', () => {
    const recorder = recorderWith({ maxEntries: 2 });

    for (const text of ['a', 'b', 'c', 'd']) {
      recorder.record(logDraft(text));
    }

    expect(recorder.snapshot().map((e) => argsOf(e)[0])).toEqual(['c', 'd']);
    expect(recorder.stats()).toEqual({ recorded: 4, dropped: 0, evicted: 2, failed: 0 });
  });

  it('clear empties the buffer and zeroes stats', () => {
    const recorder = recorderWith({ maxEntries: 1, ignoreUrls: [/ignored/] });
    recorder.record(logDraft('a'));
    recorder.record(logDraft('b'));
    recorder.record(httpDraft({ url: 'http://ignored' }));
    recorder.record(null as unknown as EntryDraft);

    recorder.clear();

    expect(recorder.snapshot()).toEqual([]);
    expect(recorder.stats()).toEqual({ recorded: 0, dropped: 0, evicted: 0, failed: 0 });
  });

  it('returns a fresh stats object and snapshot array each call', () => {
    const recorder = recorderWith();
    recorder.record(logDraft('a'));

    expect(recorder.stats()).not.toBe(recorder.stats());
    expect(recorder.snapshot()).not.toBe(recorder.snapshot());
  });

  it('notifies listeners after storing, isolates a throwing listener', () => {
    const recorder = recorderWith();
    const seen: Array<[number, number]> = [];
    recorder.onEntry(() => {
      throw new Error('bad listener');
    });
    recorder.onEntry((entry: CaptureEntry) => seen.push([entry.seq, recorder.snapshot().length]));

    recorder.record(logDraft('a'));
    recorder.record(logDraft('b'));

    // Each listener sees the entry already in the buffer.
    expect(seen).toEqual([
      [1, 1],
      [2, 2],
    ]);
    expect(recorder.stats().failed).toBe(0);
  });

  it('unsubscribe stops notifications', () => {
    const recorder = recorderWith();
    const calls: string[] = [];
    const unsubscribeSelf = recorder.onEntry(() => {
      calls.push('self');
      unsubscribeSelf();
    });
    const unsubscribeOther = recorder.onEntry(() => calls.push('other'));

    recorder.record(logDraft('a'));
    unsubscribeOther();
    unsubscribeOther();
    recorder.record(logDraft('b'));

    // The self-unsubscribing listener did not cause the next one to be skipped.
    expect(calls).toEqual(['self', 'other']);
  });

  it('never throws, counts failures', () => {
    const recorder = recorderWith();
    const hostile = {
      kind: 'log',
      t: 1,
      get level(): never {
        throw new Error('getter failed');
      },
      args: [],
    } as unknown as EntryDraft;

    expect(() => recorder.record(hostile)).not.toThrow();
    expect(() => recorder.record(null as unknown as EntryDraft)).not.toThrow();
    expect(() => recorder.record({ kind: 'nope' } as unknown as EntryDraft)).not.toThrow();

    expect(recorder.snapshot()).toEqual([]);
    expect(recorder.stats()).toEqual({ recorded: 0, dropped: 0, evicted: 0, failed: 3 });

    // A failed draft does not consume a seq.
    recorder.record(logDraft('ok'));
    expect(recorder.snapshot()[0].seq).toBe(1);
  });
});
