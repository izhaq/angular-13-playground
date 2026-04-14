import { DropdownOption } from '../../../../app-dropdown/app-dropdown.models';

export type AbbrLookup = Record<string, Record<string, string>>;

export interface FieldConfig {
  key: string;
  options: DropdownOption[];
}

export function buildAbbrLookup(fields: FieldConfig[]): AbbrLookup {
  const lookup: AbbrLookup = {};
  for (const field of fields) {
    const map: Record<string, string> = {};
    for (const opt of field.options) {
      if (opt.abbr) {
        map[opt.value] = opt.abbr;
      }
    }
    lookup[field.key] = map;
  }
  return lookup;
}
