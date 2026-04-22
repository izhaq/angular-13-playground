import { FieldConfig } from './engine-sim.models';

/**
 * Reduce a field config list into a `{ [key]: defaultValue }` map.
 * Returns a fresh object on every call so callers can safely mutate
 * without leaking changes back into the source-of-truth defaults.
 */
export function buildDefaultValues(
  fields: ReadonlyArray<FieldConfig>,
): Record<string, string | string[]> {
  const defaults: Record<string, string | string[]> = {};
  for (const field of fields) {
    defaults[field.key] = Array.isArray(field.defaultValue)
      ? [...field.defaultValue]
      : field.defaultValue;
  }
  return defaults;
}
