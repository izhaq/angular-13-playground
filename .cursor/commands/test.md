---
description: Run TDD workflow — write failing tests, implement, verify. For bugs, use Prove-It pattern.
---

# /test — Prove It Works

Follow the `test-driven-development` skill.

## For New Features (TDD)

1. Write tests that describe the expected behavior (they should FAIL)
2. Implement the code to make them pass
3. Refactor while keeping tests green
4. Run: `ng test --no-watch --browsers=ChromeHeadless`

## For Bug Fixes (Prove-It Pattern)

1. Write a test that reproduces the bug (must FAIL with current code)
2. Confirm the test fails — this proves the bug exists
3. Implement the fix
4. Confirm the test passes — this proves the fix works
5. Run the full test suite to check for regressions

## Browser Issues

For browser-related issues, also use the Playwright MCP (configured in `.cursor/mcp.json`) to verify with live browser testing:
- Navigate to the page, trigger the issue
- Inspect DOM, console, network
- Verify the fix with screenshots
