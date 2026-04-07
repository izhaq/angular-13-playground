---
description: Implement the next task incrementally — build, test, verify, commit
---

# /build — Build Incrementally

Follow the `incremental-implementation` skill alongside `test-driven-development`.

## Process

Pick the next pending task from `specs/{feature-name}/tasks.md`. For each task:

1. **Read** the task's acceptance criteria and relevant context
2. **Write a failing test** for the expected behavior (RED)
3. **Implement** the minimum code to pass the test (GREEN)
4. **Refactor** while keeping tests green
5. **Run the full test suite**: `ng test --no-watch --browsers=ChromeHeadless`
6. **Run the build**: `ng build`
7. **Commit** with a descriptive message following conventional commits
8. **Mark the task complete** in `tasks.md` and move to the next one

## On Failure

If tests fail or the build breaks, follow the `debugging-and-error-recovery` skill:
- STOP adding features
- Reproduce the failure
- Localize the issue
- Fix the root cause (not the symptom)
- Add a guard test
- Resume only after verification passes

## Scope Rules

- Touch only what the task requires
- Do not "clean up" unrelated code
- Do not add features not in the spec
- If you notice something worth improving, use `NOTICED BUT NOT TOUCHING:` block
