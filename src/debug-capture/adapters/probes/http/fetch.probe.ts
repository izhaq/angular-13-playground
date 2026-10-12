import { Clock, HeaderMap, HttpEntry, Probe, Recorder } from '../../../core';
import { describeBody, headersToMap, isTextual, responseBytes, toAbsoluteUrl } from './http-helpers';

/** What the fetch probe patches: `host.fetch` is swapped for a wrapper. */
export interface FetchHost {
  fetch: typeof fetch;
  location: { href: string };
}

/** What is known about a request when it starts. */
interface StartedRequest {
  method: string;
  url: string;
  reqHeaders: HeaderMap;
  reqBody: string | null;
  start: number;
}

/**
 * Records one `HttpEntry` per settled `fetch` (response body read, network
 * error or abort). `host` defaults to the real global; specs pass a host
 * around a bound real fetch or a fake.
 */
export function installFetchProbe(recorder: Recorder, clock: Clock, host: FetchHost = globalThis): Probe {
  const original = host.fetch;
  let active = true;

  /**
   * The original is called exactly once, with `host` as `this` and the
   * caller's arguments. The caller gets a promise that settles exactly like
   * the original one — the very same `Response` or the very same error. It is
   * a promise chained on the original (not the original itself) so that a
   * rejection the app never handles is still reported as unhandled.
   */
  const wrapper = function (...args: Parameters<typeof fetch>): Promise<Response> {
    const started = active ? attempt(() => startRequest(args)) : null;
    const pending = original.apply(host, args);
    if (started === null) return pending;
    try {
      return pending.then(
        (response) => {
          safely(() => onResponse(started, response));
          return response;
        },
        (error: unknown) => {
          safely(() => onFailure(started, error));
          throw error;
        },
      );
    } catch {
      // Not a real promise (someone else's patched fetch): hand it back untouched.
      return pending;
    }
  };

  /** What `fetch` itself does: `init` wins over the `Request`'s own method, headers and body. */
  function startRequest([input, init]: Parameters<typeof fetch>): StartedRequest {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const method = String(init?.method ?? request?.method ?? 'GET').toUpperCase();
    const url = toAbsoluteUrl(request ? request.url : (input as string | URL), host.location.href);
    let reqHeaders: HeaderMap = {};
    if (init?.headers !== undefined) reqHeaders = headersToMap(init.headers);
    else if (request) reqHeaders = headersToMap(request.headers);
    let reqBody: string | null = null;
    if (init?.body !== undefined) reqBody = describeBody(init.body);
    // Reading the Request's stream would consume the body the original is about to send.
    else if (request && request.body !== null && request.body !== undefined) reqBody = '[Request body]';
    return { method, url, reqHeaders, reqBody, start: clock.now() };
  }

  /**
   * Text bodies are read from a clone, outside the chain the caller sees, so
   * the app gets its `Response` without waiting and with its body unread.
   * Binary and event-stream bodies are never read.
   */
  function onResponse(started: StartedRequest, response: Response): void {
    const resHeaders = headersToMap(response.headers);
    const status = response.status === 0 ? null : response.status;
    if (!isTextual(response.headers.get('content-type'))) {
      record(started, { status, resHeaders, resBody: null, error: null });
      return;
    }
    response
      .clone()
      .text()
      .then(
        (text) => record(started, { status, resHeaders, resBody: text, error: null }),
        () => record(started, { status, resHeaders, resBody: null, error: null }),
      );
  }

  function onFailure(started: StartedRequest, error: unknown): void {
    record(started, { status: null, resHeaders: {}, resBody: null, error: errorKind(error) });
  }

  function record(
    started: StartedRequest,
    outcome: Pick<HttpEntry, 'status' | 'resHeaders' | 'resBody' | 'error'>,
  ): void {
    if (!active) return;
    safely(() =>
      recorder.record({
        kind: 'http',
        transport: 'fetch',
        t: started.start,
        method: started.method,
        url: started.url,
        status: outcome.status,
        durationMs: clock.now() - started.start,
        reqHeaders: started.reqHeaders,
        resHeaders: outcome.resHeaders,
        reqBody: started.reqBody,
        resBody: outcome.resBody,
        bytes: outcome.status === null ? null : responseBytes(outcome.resHeaders, outcome.resBody),
        error: outcome.error,
      }),
    );
  }

  host.fetch = wrapper;

  return {
    name: 'fetch',
    dispose(): void {
      if (!active) return;
      active = false;
      // Someone patched on top of us: unwrapping would drop their patch, so
      // ours stays in their chain as a pass-through (`active` is false).
      if (host.fetch === wrapper) host.fetch = original;
    },
  };
}

/**
 * `AbortController.abort()` rejects with an `AbortError`; `AbortSignal.timeout()`
 * with a `TimeoutError`. Everything else is a network failure.
 */
function errorKind(error: unknown): NonNullable<HttpEntry['error']> {
  const name = typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
  if (name === 'AbortError') return 'abort';
  if (name === 'TimeoutError') return 'timeout';
  return 'network';
}

/** Capture must never break the app: any bookkeeping failure is dropped. */
function safely(work: () => void): void {
  try {
    work();
  } catch {
    // Intentionally empty — see above.
  }
}

/** Like `safely`, but keeps the result; `null` when the work threw. */
function attempt<T>(work: () => T): T | null {
  try {
    return work();
  } catch {
    return null;
  }
}
