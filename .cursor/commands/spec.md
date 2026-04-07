---
description: Start spec-driven development — write a structured specification before writing code
---

# /spec — Define What to Build

Follow the `spec-driven-development` skill workflow.

## Process

1. **Surface assumptions** — Before anything else, list what you're assuming (tech stack, scope, audience) using the `ASSUMPTIONS I'M MAKING:` block
2. **Ask clarifying questions** about:
   - The objective and target users
   - Core features and acceptance criteria
   - Tech stack preferences and constraints
   - Known boundaries (always do, ask first, never do)
3. **Write a structured spec** covering six core areas:
   - Objective (what, why, who, success criteria)
   - Commands (build, test, lint, dev — full commands)
   - Project Structure (where source, tests, docs live)
   - Code Style (one real code snippet showing the style)
   - Testing Strategy (framework, locations, coverage)
   - Boundaries (always / ask first / never)
4. **Reframe vague requirements** as measurable success criteria
5. **Save** the spec to `specs/{feature-name}/spec.md`
6. **Wait for human review** before proceeding

## Output

- `specs/{feature-name}/spec.md` — The specification document

## Next Steps

After the spec is approved, run `/plan` to break it into tasks.
