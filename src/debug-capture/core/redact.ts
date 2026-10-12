import { HeaderMap, JsonValue } from '../contract';
import { setJsonKey } from './json-safe';

type JsonObject = { [key: string]: JsonValue };

/**
 * Lower-cased name sets, cached per frozen array. `resolvePolicy` freezes its
 * arrays, so on the hot path (many frames per second) the set is built once
 * per policy instead of once per call. Unfrozen arrays could change under the
 * cache, so they are converted every call.
 */
const lowerCaseSets = new WeakMap<readonly string[], ReadonlySet<string>>();

function lowerCaseSet(names: readonly string[]): ReadonlySet<string> {
  const frozen = Object.isFrozen(names);
  let set = frozen ? lowerCaseSets.get(names) : undefined;
  if (set === undefined) {
    set = new Set(names.map((name) => name.toLowerCase()));
    if (frozen) {
      lowerCaseSets.set(names, set);
    }
  }
  return set;
}

/** A new map with lower-case keys; values of the named headers (any case) become `replacement`. */
export function redactHeaders(headers: HeaderMap, names: readonly string[], replacement: string): HeaderMap {
  const redacted = lowerCaseSet(names);
  const out: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    const name = key.toLowerCase();
    setJsonKey(out, name, redacted.has(name) ? replacement : headers[key]);
  }
  return out;
}

/**
 * Replaces the value of every object key in `keys` (any case, any depth,
 * inside arrays too) with `replacement`, whatever that value was — a nested
 * `{ token: { … } }` goes whole.
 *
 * Copy-on-write: unchanged branches are shared with the input, and with no
 * match at all the input itself comes back. Safe because `JsonValue` is
 * read-only, and it saves an allocation per stored entry.
 */
export function redactJsonValue(value: JsonValue, keys: readonly string[], replacement: string): JsonValue {
  const redacted = lowerCaseSet(keys);
  return redacted.size === 0 ? value : redactIn(value, redacted, replacement);
}

/**
 * Redacts a body or text frame that holds a JSON object or array.
 *
 * Anything else — form data, HTML, a JSON string or number, broken JSON —
 * comes back unchanged: there are no keys to match. When a key matched, the
 * result is re-serialized compactly; when none did, the original text comes
 * back byte for byte. Never throws: if redaction itself fails (e.g. JSON
 * nested too deep for the stack) the whole text is replaced, so a failure
 * can never leak the value it was meant to hide.
 */
export function redactJsonText(text: string, keys: readonly string[], replacement: string): string {
  const redacted = lowerCaseSet(keys);
  if (redacted.size === 0 || !looksLikeJsonContainer(text)) {
    return text;
  }
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(text) as JsonValue;
  } catch {
    return text;
  }
  try {
    const result = redactIn(parsed, redacted, replacement);
    return result === parsed ? text : JSON.stringify(result);
  } catch {
    return replacement;
  }
}

/**
 * Whether `url` matches any pattern. Uses `String.prototype.search`, which
 * ignores and restores `lastIndex`: `RegExp.test` on a `/g` pattern resumes
 * from the last match and would alternate between true and false.
 */
export function matchesAny(url: string, patterns: readonly RegExp[]): boolean {
  for (let i = 0; i < patterns.length; i++) {
    if (url.search(patterns[i]) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Cheap first-character check, so a non-JSON body (or a streamed text frame)
 * never pays for a `JSON.parse` that is bound to fail or yield a primitive.
 */
function looksLikeJsonContainer(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // JSON whitespace: space, tab, line feed, carriage return.
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
      continue;
    }
    return c === 0x7b /* { */ || c === 0x5b /* [ */;
  }
  return false;
}

function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

function redactIn(value: JsonValue, redacted: ReadonlySet<string>, replacement: string): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (isJsonArray(value)) {
    let copy: JsonValue[] | undefined;
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const next = redactIn(item, redacted, replacement);
      if (copy === undefined && next !== item) {
        copy = value.slice(0, i);
      }
      copy?.push(next);
    }
    return copy ?? value;
  }
  const object = value as { readonly [key: string]: JsonValue };
  const keys = Object.keys(object);
  let copy: JsonObject | undefined;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = object[key];
    const next = redacted.has(key.toLowerCase()) ? replacement : redactIn(item, redacted, replacement);
    if (copy === undefined && next !== item) {
      copy = {};
      for (let j = 0; j < i; j++) {
        setJsonKey(copy, keys[j], object[keys[j]]);
      }
    }
    if (copy !== undefined) {
      setJsonKey(copy, key, next);
    }
  }
  return copy ?? value;
}
