---
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
---

# /plan — Plan How to Build It

Follow the `planning-and-task-breakdown` skill workflow.

## Process

1. **Enter plan mode** — Read only, no code changes
2. **Read the spec** from `specs/{feature-name}/spec.md` and relevant codebase sections
3. **Identify the dependency graph** between components
4. **Slice work vertically** — One complete path per task, not horizontal layers
5. **Write tasks** with:
   - Description
   - Acceptance criteria (specific, testable)
   - Verification steps (test command, build, manual check)
   - Files likely touched
   - Size estimate (XS/S/M/L — if XL, break it down further)
   - Dependencies on other tasks
6. **Add checkpoints** between phases (all tests pass, build clean, human review)
7. **Present the plan** for human review before proceeding

## Task Sizing Guide

| Size | Files | Example |
|------|-------|---------|
| XS | 1 | Add a validation rule |
| S | 1-2 | New service method + test |
| M | 3-5 | New component with service and routing |
| L | 5-8 | Multi-component feature slice |
| XL | 8+ | Too large — break it down |

## Output

- `specs/{feature-name}/plan.md` — Architecture decisions and phasing
- `specs/{feature-name}/tasks.md` — Task checklist with acceptance criteria

## Next Steps

After the plan is approved, run `/build` to start implementing tasks.
