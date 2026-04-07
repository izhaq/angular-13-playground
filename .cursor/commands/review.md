---
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
---

# /review — Quality Gate Before Merge

Follow the `code-review-and-quality` skill.

## Process

Review the current changes (staged or recent commits) across five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Load `security-hardening` skill if needed)
5. **Performance** — No N+1 patterns? No unbounded ops? (Load `performance-optimization` skill if needed)

## Output Format

Categorize every finding with severity:

- **Critical** — Must fix before merge (security vulnerability, data loss, broken functionality)
- **Important** — Should fix before merge (missing test, wrong abstraction)
- **Suggestion** — Consider for improvement (naming, optional optimization)
- **Nit** — Minor, optional (formatting, style preference)
- **FYI** — Informational only, no action needed

Include specific file:line references and fix recommendations.
Also apply the `code-review-preferences` rule (design fidelity, pattern consistency, CSS discipline).
