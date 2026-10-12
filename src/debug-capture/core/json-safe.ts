import { JsonValue } from '../contract';

/** Arrays, objects, maps and sets keep this many items; the rest become a count. */
const MAX_ITEMS = 100;

type JsonObject = { [key: string]: JsonValue };

/**
 * Turns anything a developer might `console.log` into a `JsonValue`.
 *
 * The result is a deep copy made right now: later mutation of the original
 * cannot change a stored entry, and no live reference (DOM nodes, big
 * objects) is kept alive by the buffer. It never throws — a hostile getter,
 * `toJSON` or Proxy becomes a `[Thrown: …]` marker for that one value — so
 * logging a weird object can never break the app.
 *
 * `maxDepth` counts container levels: 0 keeps primitives but turns the top
 * object or array into a placeholder.
 */
export function toJsonSafe(value: unknown, maxDepth: number): JsonValue {
  // Fast path: most console arguments are plain strings or numbers.
  const primitive = primitiveToJson(value);
  if (primitive !== undefined) {
    return primitive;
  }
  return new Cloner(maxDepth).clone(value, 0, true);
}

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

/** The converted value, or `undefined` when `value` is an object or function. */
function primitiveToJson(value: unknown): JsonValue | undefined {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'undefined':
      return '[undefined]';
    case 'bigint':
      return `${value}n`;
    case 'symbol':
      return String(value);
    default:
      return value === null ? null : undefined;
  }
}

function thrown(error: unknown): string {
  let message: string;
  try {
    message = error instanceof Error ? error.message : String(error);
  } catch {
    message = 'unknown error';
  }
  return `[Thrown: ${message}]`;
}

/** `[object Uint8Array]` → `Uint8Array`. Unlike `constructor.name`, cannot be shadowed by an own property. */
function tagOf(value: object): string {
  return Object.prototype.toString.call(value).slice(8, -1);
}

class Cloner {
  /** The objects on the current path — a repeat means a cycle, not just a shared reference. */
  private readonly ancestors = new Set<object>();

  constructor(private readonly maxDepth: number) {}

  clone(value: unknown, level: number, allowToJson: boolean): JsonValue {
    const primitive = primitiveToJson(value);
    if (primitive !== undefined) {
      return primitive;
    }
    try {
      if (typeof value === 'function') {
        return `[Function ${(value as { name?: unknown }).name || 'anonymous'}]`;
      }
      return this.cloneObject(value as object, level, allowToJson);
    } catch (error) {
      return thrown(error);
    }
  }

  private cloneObject(value: object, level: number, allowToJson: boolean): JsonValue {
    if (this.ancestors.has(value)) {
      return '[Circular]';
    }
    const leaf = describeLeaf(value);
    if (leaf !== undefined) {
      return leaf;
    }
    if (level >= this.maxDepth) {
      return placeholder(value);
    }
    const toJson = allowToJson ? (value as { toJSON?: unknown }).toJSON : undefined;
    if (typeof toJson === 'function') {
      // Same level, and no second toJSON: one that returns a fresh object with
      // its own toJSON each time must not loop forever. Checked before `value`
      // joins the ancestors, so `toJSON() { return this; }` is not a cycle.
      return this.clone(toJson.call(value), level, false);
    }
    this.ancestors.add(value);
    try {
      return this.cloneContainer(value, level + 1);
    } finally {
      this.ancestors.delete(value);
    }
  }

  private cloneContainer(value: object, next: number): JsonValue {
    if (Array.isArray(value)) {
      return this.cloneItems(value, next);
    }
    if (value instanceof Map) {
      const pairs: JsonValue[] = [];
      for (const [k, v] of value) {
        pairs.push([this.clone(k, next, true), this.clone(v, next, true)]);
        if (pairs.length === MAX_ITEMS) {
          break;
        }
      }
      return { '[Map]': withMore(pairs, value.size) };
    }
    if (value instanceof Set) {
      const items: JsonValue[] = [];
      for (const v of value) {
        items.push(this.clone(v, next, true));
        if (items.length === MAX_ITEMS) {
          break;
        }
      }
      return { '[Set]': withMore(items, value.size) };
    }
    return this.cloneProperties(value as Record<string, unknown>, next);
  }

  private cloneItems(array: readonly unknown[], next: number): JsonValue {
    const length = array.length;
    const out: JsonValue[] = [];
    for (let i = 0; i < length && i < MAX_ITEMS; i++) {
      out.push(this.cloneProperty(array, i, next));
    }
    return withMore(out, length);
  }

  private cloneProperties(object: Record<string, unknown>, next: number): JsonValue {
    const keys = Object.keys(object);
    const out: JsonObject = {};
    const kept = Math.min(keys.length, MAX_ITEMS);
    for (let i = 0; i < kept; i++) {
      setJsonKey(out, keys[i], this.cloneProperty(object, keys[i], next));
    }
    if (keys.length > MAX_ITEMS) {
      out['…'] = `…${keys.length - MAX_ITEMS} more`;
    }
    return out;
  }

  /** Reads one property in its own try, so one throwing getter costs only that property. */
  private cloneProperty(container: object, key: string | number, next: number): JsonValue {
    let item: unknown;
    try {
      item = (container as Record<string | number, unknown>)[key];
    } catch (error) {
      return thrown(error);
    }
    return this.clone(item, next, true);
  }
}

/** Objects that become a fixed description whatever the depth — never walked. */
function describeLeaf(value: object): JsonValue | undefined {
  if (value instanceof Error) {
    return {
      name: String(value.name),
      message: String(value.message),
      stack: typeof value.stack === 'string' ? value.stack : null,
    };
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '[Invalid Date]' : value.toISOString();
  }
  if (value instanceof RegExp) {
    return String(value);
  }
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return `[${tagOf(value)} ${value.byteLength} bytes]`;
  }
  // The one DOM reference in core, guarded so the layer still runs where there is no DOM.
  if (typeof Node !== 'undefined' && value instanceof Node) {
    return describeNode(value);
  }
  return undefined;
}

/** `[HTMLDivElement div#id.a.b]` for elements, `[Text]` for other nodes. */
function describeNode(node: Node): string {
  const tag = tagOf(node);
  if (node.nodeType !== 1) {
    return `[${tag}]`;
  }
  const element = node as Element;
  let selector = element.localName;
  if (element.id) {
    selector += `#${element.id}`;
  }
  const classes = element.classList;
  for (let i = 0; i < classes.length; i++) {
    selector += `.${classes[i]}`;
  }
  return `[${tag} ${selector}]`;
}

function placeholder(value: object): string {
  if (Array.isArray(value)) {
    return `[Array(${value.length})]`;
  }
  if (value instanceof Map) {
    return `[Map(${value.size})]`;
  }
  if (value instanceof Set) {
    return `[Set(${value.size})]`;
  }
  return '[Object]';
}

function withMore(items: JsonValue[], total: number): JsonValue[] {
  if (total > items.length) {
    items.push(`…${total - items.length} more`);
  }
  return items;
}
