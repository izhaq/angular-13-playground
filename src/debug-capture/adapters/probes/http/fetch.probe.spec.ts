import { Clock, EntryDraft, HttpEntry, Recorder } from '../../../core';
import { FetchHost, installFetchProbe } from './fetch.probe';

type HttpDraft = Omit<HttpEntry, 'seq'>;

/** Collects drafts; `waitFor(n)` resolves once n have arrived (bodies are read asynchronously). */
function fakeRecorder() {
  const drafts: EntryDraft[] = [];
  let waiters: Array<() => void> = [];
  const recorder: Recorder = {
    record(draft) {
      drafts.push(draft);
      const ready = waiters;
      waiters = [];
      ready.forEach((wake) => wake());
    },
    snapshot: () => [],
    clear: () => undefined,
    stats: () => ({ recorded: 0, dropped: 0, evicted: 0, failed: 0 }),
    onEntry: () => () => undefined,
  };
  const http = (): HttpDraft[] => drafts.filter((d): d is HttpDraft => d.kind === 'http');
  const waitFor = (count: number): Promise<HttpDraft[]> =>
    new Promise((resolve) => {
      const check = () => (http().length >= count ? resolve(http()) : waiters.push(check));
      check();
    });
  return { recorder, drafts, http, waitFor };
}

function fakeClock(start = 1000) {
  let time = start;
  const clock: Clock = { now: () => time };
  return { clock, advance: (ms: number) => (time += ms) };
}

const location = { href: 'http://app.test/base/page' };

/** A host around the real fetch — the global itself is never patched. */
function realHost(): FetchHost {
  return { fetch: window.fetch.bind(window), location };
}

function fakeHost(impl: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  const fetchSpy = jasmine.createSpy<typeof fetch>('fetch').and.callFake(impl);
  const host: FetchHost = { fetch: fetchSpy, location };
  return { host, fetchSpy };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks (the probe's body read) run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('installFetchProbe', () => {
  let rec: ReturnType<typeof fakeRecorder>;
  let time: ReturnType<typeof fakeClock>;
  const blobUrls: string[] = [];

  function jsonBlobUrl(text: string): string {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    blobUrls.push(url);
    return url;
  }

  beforeEach(() => {
    rec = fakeRecorder();
    time = fakeClock();
  });

  afterEach(() => blobUrls.splice(0).forEach((url) => URL.revokeObjectURL(url)));

  it('is named fetch', () => {
    const probe = installFetchProbe(rec.recorder, time.clock, realHost());
    expect(probe.name).toBe('fetch');
    probe.dispose();
  });

  it('records a real fetch of a blob URL with its body', async () => {
    const host = realHost();
    const probe = installFetchProbe(rec.recorder, time.clock, host);
    const url = jsonBlobUrl('{"a":1}');

    const response = await host.fetch(url, { headers: { Accept: 'application/json' } });
    expect(await response.json()).toEqual({ a: 1 });

    const [draft] = await rec.waitFor(1);
    expect(draft).toEqual(
      jasmine.objectContaining({
        kind: 'http',
        transport: 'fetch',
        t: 1000,
        method: 'GET',
        url,
        status: 200,
        durationMs: 0,
        reqHeaders: { accept: 'application/json' },
        reqBody: null,
        resBody: '{"a":1}',
        bytes: 7,
        error: null,
      }),
    );
    expect(draft.resHeaders['content-type']).toBe('application/json');
    probe.dispose();
  });

  it('resolves with the same Response object and leaves its body readable', async () => {
    const response = new Response('hello é', { status: 201, headers: { 'Content-Type': 'text/plain' } });
    const { host, fetchSpy } = fakeHost(() => Promise.resolve(response));
    const probe = installFetchProbe(rec.recorder, time.clock, host);

    const init = { method: 'post', body: 'ping' };
    const got = await host.fetch('/api/x', init);

    expect(got).toBe(response);
    expect(got.bodyUsed).toBeFalse();
    expect(await got.text()).toBe('hello é');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.calls.mostRecent().object).toBe(host);
    expect(fetchSpy.calls.mostRecent().args).toEqual(['/api/x', init]);

    const [draft] = await rec.waitFor(1);
    expect(draft).toEqual(
      jasmine.objectContaining({
        method: 'POST',
        url: 'http://app.test/api/x',
        status: 201,
        reqBody: 'ping',
        resBody: 'hello é',
        resHeaders: { 'content-type': 'text/plain' },
        bytes: 8,
      }),
    );
    probe.dispose();
  });

  it('takes method, headers and body from init over a Request', async () => {
    const { host } = fakeHost(() => Promise.resolve(new Response('')));
    const probe = installFetchProbe(rec.recorder, time.clock, host);
    const request = new Request('http://other.test/r', { method: 'PUT', headers: { 'X-A': 'req' }, body: 'from request' });

    await host.fetch(request, { method: 'patch', headers: [['X-B', 'init']], body: new URLSearchParams({ q: '1' }) });
    await host.fetch(new Request('http://other.test/plain', { method: 'DELETE', headers: { 'X-C': 'c' } }));
    await host.fetch(new URL('https://other.test/u'));

    const drafts = await rec.waitFor(3);
    expect(drafts.map((d) => [d.method, d.url, d.reqHeaders, d.reqBody])).toEqual([
      ['PATCH', 'http://other.test/r', { 'x-b': 'init' }, 'q=1'],
      ['DELETE', 'http://other.test/plain', { 'x-c': 'c' }, null],
      ['GET', 'https://other.test/u', {}, null],
    ]);
    probe.dispose();
  });

  it('marks a Request body without reading it', async () => {
    const { host, fetchSpy } = fakeHost(() => Promise.resolve(new Response('')));
    const probe = installFetchProbe(rec.recorder, time.clock, host);
    const request = new Request('http://other.test/upload', { method: 'POST', body: 'secret stream' });

    await host.fetch(request);

    const [draft] = await rec.waitFor(1);
    expect(draft.reqBody).toBe('[Request body]');
    expect(request.bodyUsed).toBeFalse();
    expect(fetchSpy.calls.mostRecent().args[0]).toBe(request);
    probe.dispose();
  });

  it('does not read non-textual or event-stream bodies', async () => {
    const binary = new Response(new Uint8Array(5), {
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': '5' },
    });
    const stream = new Response('data: x\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
    const binaryClone = spyOn(binary, 'clone').and.callThrough();
    const streamClone = spyOn(stream, 'clone').and.callThrough();
    const responses = [binary, stream];
    const { host } = fakeHost(() => Promise.resolve(responses.shift() as Response));
    const probe = installFetchProbe(rec.recorder, time.clock, host);

    await host.fetch('/bin');
    await host.fetch('/events');

    const drafts = await rec.waitFor(2);
    expect(drafts.map((d) => [d.url, d.status, d.resBody, d.bytes])).toEqual([
      ['http://app.test/bin', 200, null, 5],
      ['http://app.test/events', 200, null, null],
    ]);
    expect(binaryClone).not.toHaveBeenCalled();
    expect(streamClone).not.toHaveBeenCalled();
    probe.dispose();
  });

  it('records a network error and rethrows the same error', async () => {
    const failure = new TypeError('Failed to fetch');
    const { host } = fakeHost(() => Promise.reject(failure));
    const probe = installFetchProbe(rec.recorder, time.clock, host);

    const caught = await host.fetch('/down').then(
      () => 'resolved',
      (error: unknown) => error,
    );
    expect(caught).toBe(failure);
    probe.dispose();

    // A real refused connection.
    const real = realHost();
    const realProbe = installFetchProbe(rec.recorder, time.clock, real);
    await expectAsync(real.fetch('http://127.0.0.1:9/')).toBeRejectedWithError(TypeError);
    realProbe.dispose();

    const drafts = await rec.waitFor(2);
    expect(drafts.map((d) => [d.url, d.status, d.error, d.resBody, d.bytes])).toEqual([
      ['http://app.test/down', null, 'network', null, null],
      ['http://127.0.0.1:9/', null, 'network', null, null],
    ]);
  });

  it('records an abort as error abort', async () => {
    const host = realHost();
    const probe = installFetchProbe(rec.recorder, time.clock, host);
    const controller = new AbortController();

    const pending = host.fetch(jsonBlobUrl('{}'), { signal: controller.signal });
    controller.abort();
    const caught = await pending.then(
      () => null,
      (error: unknown) => error,
    );
    expect(caught instanceof DOMException && caught.name).toBe('AbortError');

    const [draft] = await rec.waitFor(1);
    expect([draft.status, draft.error]).toEqual([null, 'abort']);
    probe.dispose();

    // AbortSignal.timeout() rejects with a TimeoutError — the contract has a slot for it.
    const timeout = new DOMException('timed out', 'TimeoutError');
    const fake = fakeHost(() => Promise.reject(timeout));
    const timeoutProbe = installFetchProbe(rec.recorder, time.clock, fake.host);
    await expectAsync(fake.host.fetch('/slow')).toBeRejectedWith(timeout);
    expect(rec.http()[1].error).toBe('timeout');
    timeoutProbe.dispose();
  });

  it('restores fetch on dispose; pass-through if re-patched', async () => {
    const { host, fetchSpy } = fakeHost(() => Promise.resolve(new Response('')));
    const original = host.fetch;

    const probe = installFetchProbe(rec.recorder, time.clock, host);
    expect(host.fetch).not.toBe(original);
    probe.dispose();
    probe.dispose();
    expect(host.fetch).toBe(original);

    const again = installFetchProbe(rec.recorder, time.clock, host);
    const ours = host.fetch;
    const theirs: typeof fetch = (input, init) => ours(input, init);
    host.fetch = theirs;
    again.dispose();
    expect(host.fetch).toBe(theirs);

    const response = await host.fetch('/after');
    await flush();
    expect(response).toEqual(jasmine.any(Response));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(rec.drafts).toEqual([]);
  });

  it('records nothing for fetches settling after dispose', async () => {
    const headers = deferred<Response>();
    const failing = deferred<Response>();
    const queue = [headers.promise, failing.promise];
    const { host } = fakeHost(() => queue.shift() as Promise<Response>);
    const probe = installFetchProbe(rec.recorder, time.clock, host);

    const ok = host.fetch('/slow');
    const bad = host.fetch('/broken').then(
      () => null,
      (error: unknown) => error,
    );
    probe.dispose();

    headers.resolve(new Response('late'));
    const failure = new TypeError('late failure');
    failing.reject(failure);

    expect(await (await ok).text()).toBe('late');
    expect(await bad).toBe(failure);
    await flush();
    expect(rec.drafts).toEqual([]);
  });
});
