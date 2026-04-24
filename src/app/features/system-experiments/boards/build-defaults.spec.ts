import { buildDefaultValues } from './build-defaults';
import { FieldConfig, LabeledOption } from '../shared/models';

describe('buildDefaultValues', () => {

  const dummyOptions: LabeledOption[] = [{ value: 'x', label: 'X', abbr: 'X' }];

  function singleField(key: string, defaultValue: string): FieldConfig {
    return { key, label: key, type: 'single', options: dummyOptions, defaultValue };
  }

  function multiField(key: string, defaultValue: string[]): FieldConfig {
    return { key, label: key, type: 'multi', options: dummyOptions, defaultValue };
  }

  it('returns an empty object for an empty field list', () => {
    expect(buildDefaultValues([])).toEqual({});
  });

  it('maps each field key to its default value', () => {
    const fields = [singleField('a', 'hello'), singleField('b', 'world')];
    expect(buildDefaultValues(fields)).toEqual({ a: 'hello', b: 'world' });
  });

  it('handles a mix of single (string) and multi (string[]) defaults', () => {
    const fields = [singleField('a', 'one'), multiField('b', ['x', 'y'])];
    expect(buildDefaultValues(fields)).toEqual({ a: 'one', b: ['x', 'y'] });
  });

  it('clones array defaults so mutating the result does not leak back to the source', () => {
    const sourceArray = ['x', 'y'];
    const fields = [multiField('a', sourceArray)];

    const result = buildDefaultValues(fields);
    (result['a'] as string[]).push('z');

    expect(sourceArray).toEqual(['x', 'y']);
  });

  it('returns a fresh object on every call so callers do not share state', () => {
    const fields = [singleField('a', 'one')];

    const first = buildDefaultValues(fields);
    const second = buildDefaultValues(fields);

    expect(first).not.toBe(second);
    first['a'] = 'mutated';
    expect(second['a']).toBe('one');
  });

  it('returns independent array references between calls', () => {
    const fields = [multiField('a', ['x'])];

    const first = buildDefaultValues(fields);
    const second = buildDefaultValues(fields);

    expect(first['a']).not.toBe(second['a']);
  });

});
