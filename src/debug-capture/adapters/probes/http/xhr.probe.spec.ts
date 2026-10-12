import { Clock, EntryDraft, HttpEntry, Recorder } from '../../../core';
import { XhrHost, installXhrProbe } from './xhr.probe';

type HttpDraft = Omit<HttpEntry, 'seq'>;

/** Collects drafts; `waitFor(n)` resolves once n have arrived (real XHRs complete asynchronously). */
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

/**
 * A fresh XHR stand-in per call, so every spec patches its own prototype
 * (own methods, like the real `XMLHttpRequest.prototype`). `responseText`
 * throws for non-text response types, exactly like the browser.
 */
function createFakeXhrClass() {
  return class FakeXhr extends EventTarget {
    status = 0;
    responseType: XMLHttpRequestResponseType = '';
    response: unknown = null;
    text = '';
    rawHeaders = '';

    get responseText(): string {
      if (this.responseType !== '' && this.responseType !== 'text') {
        throw new DOMException('responseText is only available for text', 'InvalidStateError');
      }
      return this.text;
    }

    open(_method: string, _url: string | URL, _async?: boolean): unknown {
      return undefined;
    }

    setRequestHeader(_name: string, _value: string): unknown {
      return undefined;
    }

    send(_body?: unknown): unknown {
      return undefined;
    }

    getAllResponseHeaders(): string {
      return this.rawHeaders;
    }

    respond(status: number, rawHeaders: string, text: string, response: unknown = text): void {
      this.status = status;
      this.rawHeaders = rawHeaders;
      this.text = text;
      this.response = response;
      this.dispatchEvent(new Event('load'));
      this.dispatchEvent(new Event('loadend'));
    }

    fail(type: 'abort' | 'timeout' | 'error'): void {
      this.status = 0;
      this.dispatchEvent(new Event(type));
      this.dispatchEvent(new Event('loadend'));
    }
  };
}

type FakeXhrClass = ReturnType<typeof createFakeXhrClass>;

function hostFor(XhrClass: FakeXhrClass | typeof XMLHttpRequest): XhrHost {
  return { XMLHttpRequest: XhrClass as unknown as XhrHost['XMLHttpRequest'], location };
}

/** Resolves on the request's own `loadend`, after the probe's listener has run. */
function settled(xhr: XMLHttpRequest): Promise<void> {
  return new Promise((resolve) => xhr.addEventListener('loadend', () => setTimeout(resolve), { once: true }));
}

function jsonBlobUrl(text: string): string {
  return URL.createObjectURL(new Blob([text], { type: 'application/json' }));
}

describe('installXhrProbe', () => {
  let Fake: FakeXhrClass;
  let rec: ReturnType<typeof fakeRecorder>;
  let time: ReturnType<typeof fakeClock>;
  const blobUrls: string[] = [];

  beforeEach(() => {
    Fake = createFakeXhrClass();
    rec = fakeRecorder();
    time = fakeClock();
  });

  afterEach(() => blobUrls.splice(0).forEach((url) => URL.revokeObjectURL(url)));

  it('is named xhr', () => {
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    expect(probe.name).toBe('xhr');
    probe.dispose();
  });

  it('records method, absolute URL, status, headers, bodies and duration', () => {
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const xhr = new Fake();
    xhr.open('post', 'api/items?x=1');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send('{"name":"a"}');
    time.advance(25);
    xhr.respond(201, 'Content-Type: application/json\r\nContent-Length: 8\r\n', '{"id":1}');

    expect(rec.http()).toEqual([
      {
        kind: 'http',
        transport: 'xhr',
        t: 1000,
        method: 'POST',
        url: 'http://app.test/base/api/items?x=1',
        status: 201,
        durationMs: 25,
        reqHeaders: { 'content-type': 'application/json' },
        resHeaders: { 'content-type': 'application/json', 'content-length': '8' },
        reqBody: '{"name":"a"}',
        resBody: '{"id":1}',
        bytes: 8,
        error: null,
      },
    ]);
    probe.dispose();
  });

  it('records the response of a real XHR to a blob URL', async () => {
    const HostXhr = class extends XMLHttpRequest {};
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(HostXhr));
    const url = jsonBlobUrl('{"a":1}');
    blobUrls.push(url);

    const xhr = new HostXhr();
    expect(xhr instanceof XMLHttpRequest).toBeTrue();
    xhr.open('get', url);
    xhr.setRequestHeader('Accept', 'application/json');
    const done = settled(xhr);
    xhr.send();
    await done;

    const [draft] = await rec.waitFor(1);
    expect(draft).toEqual(
      jasmine.objectContaining({
        transport: 'xhr',
        method: 'GET',
        url,
        status: 200,
        reqHeaders: { accept: 'application/json' },
        resBody: '{"a":1}',
        bytes: 7,
        error: null,
      }),
    );
    expect(draft.resHeaders['content-type']).toBe('application/json');
    // The global constructor was never touched.
    expect(Object.prototype.hasOwnProperty.call(XMLHttpRequest.prototype, 'send')).toBeTrue();
    expect(XMLHttpRequest.prototype.send).not.toBe(HostXhr.prototype.send);
    probe.dispose();
  });

  it('joins repeated request headers like XHR does', () => {
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const xhr = new Fake();
    xhr.open('GET', '/x');
    xhr.setRequestHeader('X-Tag', 'a');
    xhr.setRequestHeader('x-tag', 'b');
    xhr.setRequestHeader('Accept', 'text/plain');
    xhr.send();
    xhr.respond(200, '', 'ok');

    expect(rec.http()[0].reqHeaders).toEqual({ 'x-tag': 'a, b', accept: 'text/plain' });
    probe.dispose();
  });

  it('records abort, timeout and network errors with status null', async () => {
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    for (const type of ['abort', 'timeout', 'error'] as const) {
      const xhr = new Fake();
      xhr.open('GET', `/${type}`);
      xhr.send();
      xhr.fail(type);
    }
    expect(rec.http().map((d) => [d.error, d.status, d.resBody, d.bytes])).toEqual([
      ['abort', null, null, null],
      ['timeout', null, null, null],
      ['network', null, null, null],
    ]);
    probe.dispose();

    // The same against real browser objects: a real abort and a refused connection.
    const real = fakeRecorder();
    const HostXhr = class extends XMLHttpRequest {};
    const realProbe = installXhrProbe(real.recorder, time.clock, hostFor(HostXhr));
    const url = jsonBlobUrl('{}');
    blobUrls.push(url);

    const aborted = new HostXhr();
    aborted.open('GET', url);
    aborted.send();
    aborted.abort();

    const refused = new HostXhr();
    refused.open('GET', 'http://127.0.0.1:9/');
    const done = settled(refused);
    refused.send();
    await done;

    const drafts = await real.waitFor(2);
    expect(drafts.map((d) => [d.url, d.error, d.status])).toEqual([
      [url, 'abort', null],
      ['http://127.0.0.1:9/', 'network', null],
    ]);
    realProbe.dispose();
  });

  it('describes non-text response types without reading responseText', async () => {
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const cases: Array<[XMLHttpRequestResponseType, unknown]> = [
      ['arraybuffer', new ArrayBuffer(12)],
      ['blob', new Blob(['123456789012'])],
      ['json', { a: [1, 2] }],
      ['document', document.implementation.createHTMLDocument('x')],
    ];
    for (const [type, response] of cases) {
      const xhr = new Fake();
      xhr.open('GET', '/x');
      xhr.responseType = type;
      xhr.send();
      xhr.respond(200, '', '', response);
    }
    expect(rec.http().map((d) => [d.resBody, d.bytes])).toEqual([
      ['[arraybuffer 12 bytes]', null],
      ['[blob 12 bytes]', null],
      ['{"a":[1,2]}', null],
      ['[document]', null],
    ]);
    probe.dispose();

    // A real XHR throws InvalidStateError from responseText here.
    const real = fakeRecorder();
    const HostXhr = class extends XMLHttpRequest {};
    const realProbe = installXhrProbe(real.recorder, time.clock, hostFor(HostXhr));
    const url = jsonBlobUrl('{"a":1}');
    blobUrls.push(url);
    const xhr = new HostXhr();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    const done = settled(xhr);
    xhr.send();
    await done;

    const [draft] = await real.waitFor(1);
    expect([draft.status, draft.resBody, draft.bytes]).toEqual([200, '[arraybuffer 7 bytes]', 7]);
    realProbe.dispose();
  });

  it('handles a reused instance', () => {
    const addListener = spyOn(Fake.prototype, 'addEventListener').and.callThrough();
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const xhr = new Fake();

    xhr.open('POST', '/first');
    xhr.setRequestHeader('X-A', '1');
    xhr.send('one');
    xhr.respond(200, '', 'ok');

    xhr.open('get', '/second');
    xhr.send();
    time.advance(5);
    xhr.fail('error');

    expect(rec.http().map((d) => [d.method, d.url, d.reqHeaders, d.reqBody, d.status, d.error, d.durationMs])).toEqual([
      ['POST', 'http://app.test/first', { 'x-a': '1' }, 'one', 200, null, 0],
      ['GET', 'http://app.test/second', {}, null, null, 'network', 5],
    ]);
    // Listeners are attached on the first send only.
    expect(addListener.calls.count()).toBe(4);
    probe.dispose();
  });

  it('calls each original exactly once with the same this and args', () => {
    const open = spyOn(Fake.prototype, 'open').and.returnValue('opened');
    const setHeader = spyOn(Fake.prototype, 'setRequestHeader').and.returnValue('set');
    const send = spyOn(Fake.prototype, 'send').and.returnValue('sent');
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const xhr = new Fake();

    expect(xhr.open('GET', '/x', false)).toBe('opened');
    expect(xhr.setRequestHeader('A', 'b')).toBe('set');
    const body = new Blob(['x']);
    expect(xhr.send(body)).toBe('sent');

    const expectOneCall = (spy: jasmine.Spy, args: unknown[]) => {
      expect(spy.calls.count()).toBe(1);
      expect(spy.calls.mostRecent().object).toBe(xhr);
      expect(spy.calls.mostRecent().args).toEqual(args);
    };
    expectOneCall(open, ['GET', '/x', false]);
    expectOneCall(setHeader, ['A', 'b']);
    expectOneCall(send, [body]);
    probe.dispose();
  });

  it('still sends when bookkeeping throws', () => {
    const send = spyOn(Fake.prototype, 'send').and.returnValue('sent');
    const brokenClock: Clock = {
      now: () => {
        throw new Error('clock broke');
      },
    };
    const probe = installXhrProbe(rec.recorder, brokenClock, hostFor(Fake));
    const xhr = new Fake();
    xhr.open('GET', '/x');
    expect(xhr.send('body')).toBe('sent');
    expect(send).toHaveBeenCalledOnceWith('body');
    probe.dispose();

    // A throwing recorder inside the loadend listener must not surface as an
    // error (Jasmine fails the spec on any uncaught listener error).
    const brokenRecorder: Recorder = {
      ...rec.recorder,
      record: () => {
        throw new Error('recorder broke');
      },
    };
    const second = installXhrProbe(brokenRecorder, time.clock, hostFor(Fake));
    const other = new Fake();
    other.open('GET', '/y');
    other.send();
    expect(() => other.respond(200, '', 'ok')).not.toThrow();

    // A failing original still throws to the caller, unchanged.
    const failure = new DOMException('bad state', 'InvalidStateError');
    send.and.throwError(failure);
    expect(() => other.send()).toThrow(failure);
    second.dispose();
  });

  it('restores the prototype on dispose (own and inherited methods)', () => {
    const originals = { open: Fake.prototype.open, setRequestHeader: Fake.prototype.setRequestHeader, send: Fake.prototype.send };

    // Own methods (like the real XMLHttpRequest.prototype): assigned back.
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    expect(Fake.prototype.send).not.toBe(originals.send);
    probe.dispose();
    expect(Fake.prototype.open).toBe(originals.open);
    expect(Fake.prototype.setRequestHeader).toBe(originals.setRequestHeader);
    expect(Fake.prototype.send).toBe(originals.send);

    // Inherited methods (a subclass host): our own properties are deleted.
    const Sub = class extends Fake {};
    const subProbe = installXhrProbe(rec.recorder, time.clock, hostFor(Sub));
    expect(Object.prototype.hasOwnProperty.call(Sub.prototype, 'send')).toBeTrue();
    subProbe.dispose();
    for (const name of ['open', 'setRequestHeader', 'send']) {
      expect(Object.prototype.hasOwnProperty.call(Sub.prototype, name)).withContext(name).toBeFalse();
    }
    expect(Sub.prototype.send).toBe(originals.send);

    // Re-patched on top of us: theirs stays, ours becomes a pass-through.
    const again = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const ours = Fake.prototype.send;
    const theirs = function (this: InstanceType<FakeXhrClass>, body?: unknown) {
      return ours.call(this, body);
    };
    Fake.prototype.send = theirs;
    again.dispose();
    expect(Fake.prototype.send).toBe(theirs);
    expect(Fake.prototype.open).toBe(originals.open);

    const xhr = new Fake();
    xhr.open('GET', '/x');
    xhr.send();
    xhr.respond(200, '', 'ok');
    expect(rec.http()).toEqual([]);
  });

  it('records nothing for requests completing after dispose', () => {
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const xhr = new Fake();
    xhr.open('GET', '/x');
    xhr.send();
    probe.dispose();
    xhr.respond(200, '', 'late');
    expect(rec.drafts).toEqual([]);
  });

  it('dispose is idempotent', () => {
    const original = Fake.prototype.send;
    const probe = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    probe.dispose();
    const other = installXhrProbe(rec.recorder, time.clock, hostFor(Fake));
    const otherSend = Fake.prototype.send;
    probe.dispose(); // must not touch the second probe's patch
    expect(Fake.prototype.send).toBe(otherSend);
    other.dispose();
    other.dispose();
    expect(Fake.prototype.send).toBe(original);
  });
});
