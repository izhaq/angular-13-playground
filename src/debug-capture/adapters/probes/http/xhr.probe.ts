import { Clock, HeaderMap, HttpEntry, Probe, Recorder } from '../../../core';
import { addHeader, describeBody, parseRawHeaders, responseBytes, toAbsoluteUrl } from './http-helpers';

/**
 * What the XHR probe patches. Only the prototype is touched — the constructor
 * stays as it is, so `new XMLHttpRequest()` and `instanceof` behave exactly
 * as before. Angular's `HttpXhrBackend` builds a new XHR per request, so this
 * is the probe that sees the app's `HttpClient` traffic.
 */
export interface XhrHost {
  XMLHttpRequest: { prototype: XMLHttpRequest };
  location: { href: string };
}

type XhrError = HttpEntry['error'];

/** Per-request bookkeeping. Lives in a WeakMap, never on the app's object. */
interface RequestState {
  method: string;
  url: string;
  reqHeaders: Record<string, string>;
  reqBody: string | null;
  /** Clock time at `send()`; `null` until sent. */
  start: number | null;
  error: XhrError;
}

type PatchedName = 'open' | 'setRequestHeader' | 'send';
type XhrMethod = (this: XMLHttpRequest, ...args: unknown[]) => unknown;

const ERROR_EVENTS: ReadonlyArray<[string, NonNullable<XhrError>]> = [
  ['abort', 'abort'],
  ['timeout', 'timeout'],
  ['error', 'network'],
];

/**
 * Records one `HttpEntry` per completed XHR (load, error, abort or timeout).
 * `host` defaults to the real global; specs pass a subclass or a fake.
 */
export function installXhrProbe(recorder: Recorder, clock: Clock, host: XhrHost = globalThis): Probe {
  const proto = host.XMLHttpRequest.prototype as unknown as Record<PatchedName, XhrMethod>;
  const states = new WeakMap<XMLHttpRequest, RequestState>();
  /** Instances that already carry our listeners — attached once, reused across `open()` calls. */
  const listening = new WeakSet<XMLHttpRequest>();
  let active = true;

  function onOpen(xhr: XMLHttpRequest, method: unknown, url: unknown): void {
    states.set(xhr, {
      method: String(method).toUpperCase(),
      url: toAbsoluteUrl(String(url), host.location.href),
      reqHeaders: {},
      reqBody: null,
      start: null,
      error: null,
    });
  }

  function onSetRequestHeader(xhr: XMLHttpRequest, name: unknown, value: unknown): void {
    const state = states.get(xhr);
    if (state) addHeader(state.reqHeaders, String(name), String(value));
  }

  function onSend(xhr: XMLHttpRequest, body: unknown): void {
    const state = states.get(xhr);
    // Opened before install, or a second send() (which the original rejects): nothing to stamp.
    if (!state || state.start !== null) return;
    if (!listening.has(xhr)) {
      listening.add(xhr);
      for (const [type, error] of ERROR_EVENTS) {
        xhr.addEventListener(type, () => safely(() => markError(xhr, error)));
      }
      xhr.addEventListener('loadend', () => safely(() => onLoadEnd(xhr)));
    }
    state.reqBody = describeBody(body);
    state.start = clock.now();
  }

  function markError(xhr: XMLHttpRequest, error: NonNullable<XhrError>): void {
    const state = states.get(xhr);
    if (state) state.error = error;
  }

  function onLoadEnd(xhr: XMLHttpRequest): void {
    const state = states.get(xhr);
    if (!state || state.start === null) return;
    states.delete(xhr);
    if (!active) return;

    const status = state.error !== null || xhr.status === 0 ? null : xhr.status;
    const resHeaders: HeaderMap = status === null ? {} : parseRawHeaders(xhr.getAllResponseHeaders());
    const body = status === null ? { text: null, described: null } : readResponse(xhr);
    recorder.record({
      kind: 'http',
      transport: 'xhr',
      t: state.start,
      method: state.method,
      url: state.url,
      status,
      durationMs: clock.now() - state.start,
      reqHeaders: state.reqHeaders,
      resHeaders,
      reqBody: state.reqBody,
      resBody: body.described,
      bytes: status === null ? null : responseBytes(resHeaders, body.text),
      error: state.error,
    });
  }

  const patches = [
    patch(proto, 'open', function (args) {
      onOpen(this, args[0], args[1]);
    }),
    patch(proto, 'setRequestHeader', function (args) {
      onSetRequestHeader(this, args[0], args[1]);
    }),
    patch(proto, 'send', function (args) {
      onSend(this, args[0]);
    }, true),
  ];

  /**
   * Wraps one prototype method. The original is called exactly once with the
   * same `this` and arguments and its result returned; bookkeeping is
   * swallowed if it throws. `open` / `setRequestHeader` book after the
   * original succeeds (a rejected call changes nothing); `send` books before,
   * so the start time and listeners precede any event a synchronous request
   * fires inside the original.
   */
  function patch(
    target: Record<PatchedName, XhrMethod>,
    name: PatchedName,
    book: (this: XMLHttpRequest, args: unknown[]) => void,
    before = false,
  ) {
    const wasOwn = Object.prototype.hasOwnProperty.call(target, name);
    const original = target[name];
    const wrapper: XhrMethod = function (this: XMLHttpRequest, ...args: unknown[]) {
      if (active && before) safely(() => book.call(this, args));
      const result = original.apply(this, args);
      if (active && !before) safely(() => book.call(this, args));
      return result;
    };
    target[name] = wrapper;
    return { name, original, wrapper, wasOwn };
  }

  return {
    name: 'xhr',
    dispose(): void {
      if (!active) return;
      active = false;
      for (const { name, original, wrapper, wasOwn } of patches) {
        // Someone patched on top of us: unwrapping would drop their patch, so
        // ours stays in their chain as a pass-through (`active` is false).
        if (proto[name] !== wrapper) continue;
        if (wasOwn) proto[name] = original;
        else delete (proto as Partial<Record<PatchedName, XhrMethod>>)[name];
      }
    },
  };
}

/**
 * The response body by `responseType`. `responseText` is read only for text
 * types — for any other type the browser throws `InvalidStateError`.
 * `text` is set only when the body is the response text itself (it then
 * counts towards `bytes`).
 */
function readResponse(xhr: XMLHttpRequest): { text: string | null; described: string | null } {
  switch (xhr.responseType) {
    case '':
    case 'text':
      return { text: xhr.responseText, described: xhr.responseText };
    case 'json':
      return { text: null, described: xhr.response === null ? null : JSON.stringify(xhr.response) };
    case 'arraybuffer': {
      const buffer: unknown = xhr.response;
      return { text: null, described: buffer instanceof ArrayBuffer ? `[arraybuffer ${buffer.byteLength} bytes]` : null };
    }
    case 'blob': {
      const blob: unknown = xhr.response;
      return { text: null, described: typeof Blob !== 'undefined' && blob instanceof Blob ? `[blob ${blob.size} bytes]` : null };
    }
    case 'document':
      return { text: null, described: '[document]' };
    default:
      return { text: null, described: null };
  }
}

/** Capture must never break the app: any bookkeeping failure is dropped. */
function safely(work: () => void): void {
  try {
    work();
  } catch {
    // Intentionally empty — see above.
  }
}
