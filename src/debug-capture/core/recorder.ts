import {
  CaptureEntry,
  CapturePolicy,
  CaptureStats,
  EntryDraft,
  EntryListener,
  HeaderMap,
  Recorder,
  Unsubscribe,
} from '../contract';
import { toJsonSafe } from './json-safe';
import { looksLikeJsonContainer, matchesAny, redactHeaders, redactJsonText, redactParams } from './redact';
import { RingBuffer } from './ring-buffer';
import { truncate } from './truncate';

/**
 * The one place policy is applied. Probes hand over drafts as they saw them;
 * ignore, sample, redact, truncate and evict all happen here, on the way INTO
 * the buffer — so nothing the policy removes is ever stored, let alone
 * exported.
 *
 * `record()` is the hot path (a busy WebSocket calls it many times a second):
 * every step is O(1) in the buffer size, a log call's cloning has a fixed
 * budget, a socket's URL is redacted once rather than per frame, and
 * listeners are only copied when there are any.
 *
 * Stored entries are deeply frozen — every part is frozen as it is built —
 * so a listener cannot change what a later export contains.
 */
export function createRecorder(policy: CapturePolicy): Recorder {
  const buffer = new RingBuffer<CaptureEntry>(policy.maxEntries);
  const listeners: EntryListener[] = [];
  let lastSeq = 0;
  let recorded = 0;
  let dropped = 0;
  let evicted = 0;
  let failed = 0;

  // A busy socket stores the same URL with every frame: redact it once.
  let lastUrl: string | undefined;
  let lastPolicedUrl = '';

  /**
   * The URL as stored: secret query parameters redacted, then truncated.
   * `ignoreUrls` and `redactBodyUrls` still match the original.
   */
  function policedUrl(url: string): string {
    if (url !== lastUrl) {
      lastPolicedUrl = truncate(redactParams(url, policy.redactJsonKeys, policy.redactedValue), policy.maxBodyLength);
      lastUrl = url;
    }
    return lastPolicedUrl;
  }

  function policedHeaders(headers: HeaderMap): HeaderMap {
    return redactHeaders(headers, policy.redactHeaders, policy.redactedValue, policy.maxBodyLength);
  }

  /** Body / frame text after policy: whole-body redaction wins over key redaction. */
  function policedText(text: string, url: string, isJsonCandidate: boolean): string {
    if (matchesAny(url, policy.redactBodyUrls)) {
      return policy.redactedValue;
    }
    const redacted = isJsonCandidate ? redactJsonText(text, policy.redactJsonKeys, policy.redactedValue) : text;
    return truncate(redacted, policy.maxBodyLength);
  }

  /**
   * An HTTP body: JSON keys, or the parameters of a form body. A body with no
   * content-type counts as a possible form: for a `URLSearchParams` body the
   * browser adds the header only after the probe has seen the call.
   */
  function policedBody(body: string | null, url: string, headers: HeaderMap): string | null {
    if (body === null) {
      return null;
    }
    if (matchesAny(url, policy.redactBodyUrls)) {
      return policy.redactedValue;
    }
    let redacted: string;
    if (looksLikeJsonContainer(body)) {
      redacted = redactJsonText(body, policy.redactJsonKeys, policy.redactedValue);
    } else {
      const type = contentType(headers);
      redacted =
        type === undefined || type.toLowerCase().indexOf('application/x-www-form-urlencoded') !== -1
          ? redactParams(body, policy.redactJsonKeys, policy.redactedValue)
          : body;
    }
    return truncate(redacted, policy.maxBodyLength);
  }

  /** Probes lower-case header names; look in any case anyway, a missed form type would leak. */
  function contentType(headers: HeaderMap): string | undefined {
    const direct = headers['content-type'];
    if (direct !== undefined) {
      return direct;
    }
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'content-type') {
        return headers[name];
      }
    }
    return undefined;
  }

  /** An error message may be a stringified object (an unhandled rejection) or name a URL with a token. */
  function policedMessage(message: string): string {
    const json = redactJsonText(message, policy.redactJsonKeys, policy.redactedValue);
    return truncate(redactParams(json, policy.redactJsonKeys, policy.redactedValue), policy.maxBodyLength);
  }

  /** Builds the stored entry field by field, so nothing a probe attached beyond the contract is kept. */
  function normalise(draft: EntryDraft, seq: number): CaptureEntry {
    switch (draft.kind) {
      case 'log':
        return {
          kind: 'log',
          seq,
          t: draft.t,
          level: draft.level,
          args: toJsonSafe(draft.args, policy),
        };
      case 'http':
        return {
          kind: 'http',
          seq,
          t: draft.t,
          transport: draft.transport,
          method: draft.method.toUpperCase(),
          url: policedUrl(draft.url),
          status: draft.status,
          durationMs: draft.durationMs,
          reqHeaders: policedHeaders(draft.reqHeaders),
          resHeaders: policedHeaders(draft.resHeaders),
          reqBody: policedBody(draft.reqBody, draft.url, draft.reqHeaders),
          resBody: policedBody(draft.resBody, draft.url, draft.resHeaders),
          bytes: draft.bytes,
          error: draft.error,
        };
      case 'ws':
        return {
          kind: 'ws',
          seq,
          t: draft.t,
          socketId: draft.socketId,
          url: policedUrl(draft.url),
          event: draft.event,
          opcode: draft.opcode,
          bytes: draft.bytes,
          // Binary frames (base64) and close reasons are never JSON: truncate only.
          data: draft.data === null ? null : policedText(draft.data, draft.url, draft.opcode === 'text'),
          code: draft.code,
        };
      case 'error':
        return {
          kind: 'error',
          seq,
          t: draft.t,
          source: draft.source,
          message: policedMessage(draft.message),
          stack: draft.stack === null ? null : truncate(draft.stack, policy.maxBodyLength),
        };
      default: {
        const unknownDraft: never = draft;
        throw new TypeError(`Unknown draft kind: ${(unknownDraft as { kind?: unknown }).kind}`);
      }
    }
  }

  /** False when the sampler rejects the draft. A throwing sampler keeps it: losing data silently is worse. */
  function sampled(draft: EntryDraft): boolean {
    const sample = policy.sample;
    if (sample === undefined) {
      return true;
    }
    try {
      return sample(draft) !== false;
    } catch {
      failed++;
      return true;
    }
  }

  function notify(entry: CaptureEntry): void {
    // A copy, so a listener can unsubscribe itself without making the loop skip the next one.
    for (const listener of listeners.slice()) {
      try {
        listener(entry);
      } catch {
        // A broken listener (e.g. a panel) must not stop capture or the other listeners.
      }
    }
  }

  return {
    record(draft: EntryDraft): void {
      try {
        if ((draft.kind === 'http' || draft.kind === 'ws') && matchesAny(draft.url, policy.ignoreUrls)) {
          dropped++;
          return;
        }
        if (!sampled(draft)) {
          dropped++;
          return;
        }
        // seq is consumed only once the entry is built, so a failed draft leaves no gap.
        const entry = Object.freeze(normalise(draft, lastSeq + 1));
        lastSeq = entry.seq;
        if (buffer.push(entry) !== undefined) {
          evicted++;
        }
        recorded++;
        if (listeners.length > 0) {
          notify(entry);
        }
      } catch {
        // Capture must never throw into the code it observes.
        failed++;
      }
    },

    snapshot(): readonly CaptureEntry[] {
      return buffer.toArray();
    },

    clear(): void {
      buffer.clear();
      recorded = 0;
      dropped = 0;
      evicted = 0;
      failed = 0;
    },

    stats(): CaptureStats {
      return { recorded, dropped, evicted, failed };
    },

    onEntry(listener: EntryListener): Unsubscribe {
      listeners.push(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) {
          return;
        }
        subscribed = false;
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}
