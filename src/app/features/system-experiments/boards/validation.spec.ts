import { SIDE, WHEEL, YES_NO } from '../shared/option-values';
import { ValidationRule, affectedWheels, runRules } from './validation';

describe('affectedWheels', () => {
  it('multiplies sides by wheels (both sides + one wheel = two wheels)', () => {
    expect(affectedWheels({ sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1] })).toBe(2);
    expect(affectedWheels({ sides: [SIDE.Left], wheels: [WHEEL.W1] })).toBe(1);
    expect(affectedWheels({ sides: [SIDE.Left], wheels: [WHEEL.W1, WHEEL.W2] })).toBe(2);
    expect(affectedWheels({ sides: [], wheels: [] })).toBe(0);
  });
});

describe('runRules', () => {

  // A rule comparing a form field to the CMD scope (the `abort` shape).
  const oneWheelRule: ValidationRule = {
    id: 'abort-one-wheel',
    validate: ({ values, cmd }) =>
      values['abort'] === YES_NO.Yes && affectedWheels(cmd) > 1 ? 'one wheel only' : null,
  };

  // A rule comparing ONE form field to ANOTHER — the case the field-scoped
  // design couldn't express, now trivial because a rule sees all values.
  const crossFieldRule: ValidationRule = {
    id: 'b-requires-a',
    validate: ({ values }) =>
      values['a'] === YES_NO.Yes && values['b'] !== YES_NO.Yes
        ? 'b must be yes when a is yes'
        : null,
  };

  const RULES = [oneWheelRule, crossFieldRule];

  it('returns no violations when every rule passes', () => {
    const violations = runRules(RULES, {
      values: { abort: YES_NO.No, a: YES_NO.No, b: YES_NO.No },
      cmd: { sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1, WHEEL.W2] },
    });
    expect(violations).toEqual([]);
  });

  it('flags a form-vs-CMD rule (abort active + more than one wheel)', () => {
    const violations = runRules(RULES, {
      values: { abort: YES_NO.Yes, a: YES_NO.No, b: YES_NO.No },
      cmd: { sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1] },
    });
    expect(violations).toEqual([{ ruleId: 'abort-one-wheel', message: 'one wheel only' }]);
  });

  it('flags a form-vs-form rule (b required when a is yes)', () => {
    const violations = runRules(RULES, {
      values: { abort: YES_NO.No, a: YES_NO.Yes, b: YES_NO.No },
      cmd: { sides: [SIDE.Left], wheels: [WHEEL.W1] },
    });
    expect(violations).toEqual([{ ruleId: 'b-requires-a', message: 'b must be yes when a is yes' }]);
  });

  it('accumulates violations from every failing rule', () => {
    const violations = runRules(RULES, {
      values: { abort: YES_NO.Yes, a: YES_NO.Yes, b: YES_NO.No },
      cmd: { sides: [SIDE.Left, SIDE.Right], wheels: [WHEEL.W1] },
    });
    expect(violations.map((v) => v.ruleId)).toEqual(['abort-one-wheel', 'b-requires-a']);
  });
});
