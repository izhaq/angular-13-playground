import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';
import { YES_NO } from '../../shared/option-values';
import { ValidationRule, affectedWheels } from '../validation';

/**
 * Apply-time rules for the Primary board. Each rule sees the whole board —
 * all form values + the CMD scope — so it can compare a field to the CMD
 * scope (abort, below) or one form field to another. Add a rule here and
 * nothing else changes; the board service already runs the whole list.
 */
export const PRIMARY_COMMANDS_RULES: ValidationRule[] = [
  {
    // Backend applies abort to a single wheel. Both sides + one wheel targets
    // two wheels, so the CMD scope must resolve to exactly one.
    id: 'abort-affects-one-wheel',
    validate: ({ values, cmd }) =>
      values['abort'] === YES_NO.Yes && affectedWheels(cmd) > 1
        ? L.abortScopeRule
        : null,
  },
];
