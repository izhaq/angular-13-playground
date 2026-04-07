# Preferred response templates

## Template: create or refactor

### Summary
One short paragraph describing the direction-safe strategy.

### Updated code
Provide the corrected code first.

### Bidi notes
- State where `dir` was applied and why.
- State which logical CSS properties replaced physical ones.
- State how mixed-direction content is isolated.
- State what directional icons or motion were intentionally preserved or mirrored.

### Risk check
- Note unresolved product decisions.
- Note places that still need Arabic/Hebrew QA.

## Template: audit only

### Critical bidi bugs
- List concrete breakages.

### Why they break
- Explain in terms of base direction, isolation, or physical CSS assumptions.

### Recommended fix
- Give exact HTML/CSS changes.

### Patched example
- Provide a minimal corrected snippet.
