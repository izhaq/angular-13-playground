import { FieldConfig } from '../shared/models';
import { SIDE, WHEEL, YES_NO } from '../shared/option-values';
import { validateCmd } from './validate-cmd';

/**
 * Two field configs: one carries an `abort`-style single-wheel constraint,
 * the others don't. Enough to prove the generic pass — active vs inactive,
 * product-of-scope math, per-field tagging.
 */
const ABORT_MESSAGE = 'one wheel only';

const UNCONSTRAINED_FIELD: FieldConfig = {
  key: 'mlmTransmit',
  label: 'MLM transmit',
  type: 'single',
  options: [{ value: YES_NO.No, label: 'No', abbr: 'N' }],
  defaultValue: YES_NO.No,
};

const ABORT_FIELD: FieldConfig = {
  key: 'abort',
  label: 'Abort',
  type: 'single',
  options: [{ value: YES_NO.Yes, label: 'Yes', abbr: 'Y' }],
  defaultValue: YES_NO.No,
  cmdConstraint: {
    appliesWhen: (v) => v === YES_NO.Yes,
    maxAffectedWheels: 1,
    message: ABORT_MESSAGE,
  },
};

const FIELDS: FieldConfig[] = [UNCONSTRAINED_FIELD, ABORT_FIELD];

describe('validateCmd', () => {

  it('returns no errors when no constrained field is active', () => {
    const errors = validateCmd(
      FIELDS,
      { mlmTransmit: YES_NO.No, abort: YES_NO.No },
      { sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1, WHEEL.W2] },
    );
    expect(errors).toEqual([]);
  });

  it('allows an active constraint when the scope resolves to one wheel', () => {
    const errors = validateCmd(
      FIELDS,
      { abort: YES_NO.Yes },
      { sides: [SIDE.Left], wheels: [WHEEL.W1] },
    );
    expect(errors).toEqual([]);
  });

  it('flags an active constraint when two wheels on one side are selected', () => {
    const errors = validateCmd(
      FIELDS,
      { abort: YES_NO.Yes },
      { sides: [SIDE.Left], wheels: [WHEEL.W1, WHEEL.W2] },
    );
    expect(errors).toEqual([{ fieldKey: 'abort', message: ABORT_MESSAGE }]);
  });

  it('flags both-sides + one-wheel — that targets two wheels', () => {
    const errors = validateCmd(
      FIELDS,
      { abort: YES_NO.Yes },
      { sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1] },
    );
    expect(errors.length).toBe(1);
    expect(errors[0].fieldKey).toBe('abort');
  });

  it('ignores the constraint while its field value does not match `appliesWhen`', () => {
    const errors = validateCmd(
      FIELDS,
      { abort: YES_NO.No },
      { sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1, WHEEL.W2] },
    );
    expect(errors).toEqual([]);
  });
});
