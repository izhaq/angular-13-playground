import { CmdSelection } from '../shared/models';

/**
 * Everything a rule can look at: the whole board's current form values plus
 * the CMD scope about to be applied. Because a rule receives *all* values,
 * it can compare a field to the CMD scope (e.g. `abort`) OR one form field
 * to another — that's what makes the mechanism generic.
 */
export interface ValidationContext {
  values: Record<string, string | string[]>;
  cmd: CmdSelection;
}

/**
 * One Apply-time rule. `validate` returns a message when the rule is
 * violated, or `null` when it passes. Pure and side-effect free — trivially
 * testable and reusable across boards.
 */
export interface ValidationRule {
  /** Stable identifier — used in violations and handy for tests. */
  id: string;
  validate: (ctx: ValidationContext) => string | null;
}

export interface RuleViolation {
  ruleId: string;
  message: string;
}

/**
 * Run every rule against one context and collect the violations (empty =
 * valid). Rules are independent; all of them run so the host can surface as
 * many or as few messages as it likes.
 */
export function runRules(
  rules: ReadonlyArray<ValidationRule>,
  ctx: ValidationContext,
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  for (const rule of rules) {
    const message = rule.validate(ctx);
    if (message !== null) {
      violations.push({ ruleId: rule.id, message });
    }
  }
  return violations;
}

/**
 * Wheels a CMD scope touches = `sides * wheels`. Selecting both sides and one
 * wheel targets two wheels (one per side), which is why scope rules count the
 * product rather than sides or wheels alone. Shared helper so wheel-count
 * rules stay one-liners.
 */
export function affectedWheels(cmd: CmdSelection): number {
  return cmd.sides.length * cmd.wheels.length;
}
