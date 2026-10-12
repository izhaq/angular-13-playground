import { HeaderMap, JsonValue } from '../contract';
import { truncate } from './truncate';

type JsonObject = { [key: string]: JsonValue };

/**
 * Sets `target[key]` as an own data property. Plain assignment of the key
 * `__proto__` would change the prototype instead and silently lose the value
 * (`JSON.parse` does produce such own keys).
 */
export function setJsonKey(target: JsonObject, key: string, value: JsonValue): void {
  if (key === '__proto__') {
    Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  } else {
    target[key] = value;
  }
}

/**
 * The form a secret key is compared in: lower-case, without `_` and `-`. So
 * `access_token`, `Access-Token` and `accessToken` are one key, and a policy
 * may list it in any of those spellings.
 */
export function normaliseKey(key: string): string {
  const lower = key.toLowerCase();
  // Most keys have neither character: skip the regex for them.
  return lower.indexOf('_') === -1 && lower.indexOf('-') === -1 ? lower : lower.replace(/[_-]/g, '');
}

/**
 * Name sets, cached per frozen array. `resolvePolicy` freezes its arrays, so
 * on the hot path (many frames per second) a set is built once per policy
 * instead of once per call. Unfrozen arrays could change under the cache, so
 * they are converted every call.
 */
const headerSets = new WeakMap<readonly string[], ReadonlySet<string>>();
const keySets = new WeakMap<readonly string[], ReadonlySet<string>>();

function cachedSet(
  cache: WeakMap<readonly string[], ReadonlySet<string>>,
  names: readonly string[],
  convert: (name: string) => string,
): ReadonlySet<string> {
  const frozen = Object.isFrozen(names);
  let set = frozen ? cache.get(names) : undefined;
  if (set === undefined) {
    set = new Set(names.map(convert));
    if (frozen) {
      cache.set(names, set);
    }
  }
  return set;
}

function lowerCase(name: string): string {
  return name.toLowerCase();
}

/** `keys` normalised with `normaliseKey`, for matching with `isSecretKey`. */
export function secretKeySet(keys: readonly string[]): ReadonlySet<string> {
  return cachedSet(keySets, keys, normaliseKey);
}

export function isSecretKey(secrets: ReadonlySet<string>, key: string): boolean {
  return secrets.size > 0 && secrets.has(normaliseKey(key));
}

/**
 * Whether `object` is a named field such as `{ name: 'password', value: … }`
 * whose name is a secret — then its `value` is the secret. This is how
 * Angular's `HttpHeaders` (`{ name, value, op }`) and `HttpParams`
 * (`{ param, value, op }`) hold pending changes until first read, and how
 * HAR headers and jQuery's `serializeArray()` list fields.
 */
export function namesSecret(object: { readonly [key: string]: unknown }, secrets: ReadonlySet<string>): boolean {
  const name = object['name'] ?? object['param'];
  return typeof name === 'string' && isSecretKey(secrets, name);
}

/**
 * A new, frozen map with lower-case keys; values of the named headers (any
 * case) become `replacement`, the others are cut to `maxValueLength`.
 */
export function redactHeaders(
  headers: HeaderMap,
  names: readonly string[],
  replacement: string,
  maxValueLength = Infinity,
): HeaderMap {
  const redacted = cachedSet(headerSets, names, lowerCase);
  const out: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    const name = key.toLowerCase();
    setJsonKey(out, name, redacted.has(name) ? replacement : truncate(headers[key], maxValueLength));
  }
  return Object.freeze(out);
}

/**
 * Replaces the value of every object key in `keys` (compared with
 * `normaliseKey`, at any depth, inside arrays too) with `replacement`,
 * whatever that value was — a nested `{ token: { … } }` goes whole. The
 * `value` of a named field that `namesSecret` matches goes too.
 *
 * Copy-on-write: unchanged branches are shared with the input, and with no
 * match at all the input itself comes back. Safe because `JsonValue` is
 * read-only, and it saves an allocation per stored entry.
 */
export function redactJsonValue(value: JsonValue, keys: readonly string[], replacement: string): JsonValue {
  const secrets = secretKeySet(keys);
  return secrets.size === 0 ? value : redactIn(value, secrets, replacement);
}

/**
 * Redacts a body or text frame that holds a JSON object or array (a leading
 * byte-order mark is allowed).
 *
 * Anything else — form data, HTML, a JSON string or number, broken JSON —
 * comes back unchanged: there are no keys to match. When a key matched, the
 * result is re-serialized compactly; when none did, the original text comes
 * back byte for byte. Never throws: if redaction itself fails (e.g. JSON
 * nested too deep for the stack) the whole text is replaced, so a failure
 * can never leak the value it was meant to hide.
 */
export function redactJsonText(text: string, keys: readonly string[], replacement: string): string {
  const secrets = secretKeySet(keys);
  if (secrets.size === 0 || !looksLikeJsonContainer(text)) {
    return text;
  }
  let parsed: JsonValue;
  try {
    // JSON.parse rejects a byte-order mark.
    parsed = JSON.parse(text.charCodeAt(0) === BOM ? text.slice(1) : text) as JsonValue;
  } catch {
    return text;
  }
  try {
    const result = redactIn(parsed, secrets, replacement);
    return result === parsed ? text : JSON.stringify(result);
  } catch {
    return replacement;
  }
}

/**
 * `name=value` parameters: a separator (`?`, `#`, `&`, `;`, whitespace or the
 * start of the text), a name, `=`, and a value running to the next separator.
 * The value also takes `:` and `/`, so a secret that contains them is never
 * partly kept.
 */
const PARAM = /(^|[?#&;\s])([^=?#&;\s]+)=([^#&;\s]*)/g;

/**
 * Replaces the values of secret parameters (names compared with
 * `normaliseKey`, after URL-decoding) with `replacement`: URL queries and
 * fragments (`wss://h/ws?access_token=…`), form bodies (`password=…&…`), and
 * URLs inside free text such as an error message.
 *
 * Works on the raw string — a round trip through `URL` or `URLSearchParams`
 * would re-encode everything else. With no match the input comes back as is.
 */
export function redactParams(text: string, keys: readonly string[], replacement: string): string {
  const secrets = secretKeySet(keys);
  if (secrets.size === 0 || text.indexOf('=') === -1) {
    return text;
  }
  return text.replace(PARAM, (match: string, separator: string, name: string) =>
    isSecretKey(secrets, decodeName(name)) ? `${separator}${name}=${replacement}` : match,
  );
}

/** `access%5Ftoken` → `access_token`; `+` is a space in forms. Malformed escapes stay as they are. */
function decodeName(name: string): string {
  if (name.indexOf('%') === -1 && name.indexOf('+') === -1) {
    return name;
  }
  try {
    return decodeURIComponent(name.replace(/\+/g, ' '));
  } catch {
    return name;
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

const BOM = 0xfeff;

/**
 * Cheap first-character check, so a non-JSON body (or a streamed text frame)
 * never pays for a `JSON.parse` that is bound to fail or yield a primitive.
 */
export function looksLikeJsonContainer(text: string): boolean {
  for (let i = text.charCodeAt(0) === BOM ? 1 : 0; i < text.length; i++) {
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

function redactIn(value: JsonValue, secrets: ReadonlySet<string>, replacement: string): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (isJsonArray(value)) {
    let copy: JsonValue[] | undefined;
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const next = redactIn(item, secrets, replacement);
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
    const secret = isSecretKey(secrets, key) || (key === 'value' && namesSecret(object, secrets));
    const next = secret ? replacement : redactIn(item, secrets, replacement);
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
