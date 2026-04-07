---
description: Simplify code for clarity and maintainability — reduce complexity without changing behavior
---

# /code-simplify — Clarity Over Cleverness

Follow the `code-simplification` skill.

## Process

1. **Read project conventions** from `.cursor/rules/`
2. **Identify target code** — Recent changes unless a broader scope is specified
3. **Understand before changing** — Purpose, callers, edge cases, test coverage
4. **Apply Chesterton's Fence** — Understand WHY code exists before changing it
5. **Scan for simplification opportunities:**
   - Deep nesting → guard clauses or extracted helpers
   - Long functions (>50 lines) → split by responsibility
   - Nested ternaries → if/else or switch
   - Generic names → descriptive names
   - Duplicated logic → shared functions (only after 3+ occurrences)
   - Dead code → remove after confirming with user
6. **Apply incrementally** — Run `ng test` after each change
7. **Verify**: all tests pass, `ng build` succeeds, diff is clean

## Rules

- Preserve exact behavior — simplification must NOT change what the code does
- Rule of 500: functions under 500 lines, files under 500 lines
- Three similar lines > one premature abstraction
- If tests fail after a simplification, revert and reconsider

## Next Steps

After simplifying, run `/review` to verify the result.
