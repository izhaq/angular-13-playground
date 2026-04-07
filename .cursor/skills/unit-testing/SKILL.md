---
name: unit-testing
description: Run unit tests for changed files, fix failures iteratively until all pass. Use when running tests, fixing test failures, or when user mentions .spec.ts files.
---

# Unit Testing

Run unit tests for changed files and fix failures iteratively until all pass.

## Test Command
```bash
# Run all tests
ng test --no-watch --browsers=ChromeHeadless

# Run specific test file
ng test --include='**/task.service.spec.ts' --no-watch --browsers=ChromeHeadless
```

## Workflow

### Step 1: Identify Changed Files
```bash
git diff --name-only origin/main...HEAD | grep '\.ts$'
```

### Step 2: Find Related Test Files
For each changed `.ts` file, check if a corresponding `.spec.ts` exists.

### Step 3: Run Tests
```bash
ng test --no-watch --browsers=ChromeHeadless
```

### Step 4: Fix Failures Iteratively
If tests fail:
1. Analyze the failure and error messages
2. Fix the code or test
3. Re-run tests
4. Repeat until all pass

## Testing Preferences

### Simplicity First
- Do not over-engineer test code
- Prefer simple, straightforward tests over complex abstractions
- Only create helper functions when there's actual duplication (3+ occurrences)
- If a simple inline solution works and is readable, use it

### DRY Principles (3+ occurrences)
- Extract duplicate TestBed configuration to helper functions
- Extract repeated mock setup to helper functions
- Reuse default fixtures from `beforeEach` when possible

### TestBed Optimization
- Prefer using the default fixture from `beforeEach` when it already has the required configuration
- Only reset and reconfigure TestBed when you need a different state than the default
- When resetting is necessary, use helper functions to avoid duplication

### Mock Patterns
```typescript
// Use jasmine.createSpyObj for service mocking
const taskService = jasmine.createSpyObj('TaskService', ['getTasks', 'createTask']);

// Helper function for repeated mock creation (3+ occurrences)
const createTaskServiceMock = () => {
  return jasmine.createSpyObj('TaskService', ['getTasks', 'createTask', 'updateTask']);
};
```

### Test Organization
- Remove redundant tests (e.g., "should create" when other tests cover it)
- Group related tests in `describe` blocks with clear descriptions
- Each test verifies one concept

### Using Default Fixture (Preferred)
```typescript
it('should render tasks when loaded', () => {
  // Default beforeEach already configured with test data
  const items = fixture.debugElement.queryAll(By.css('.task-item'));
  expect(items.length).toBe(expectedCount);
});
```

### Resetting TestBed Only When Necessary
```typescript
it('should show empty state when no tasks', async () => {
  // Need different state than default
  taskService.getTasks.and.returnValue(of([]));
  TestBed.resetTestingModule();
  await configureTestBed();
  
  const emptyState = fixture.debugElement.query(By.css('.empty-state'));
  expect(emptyState).toBeTruthy();
});
```

## Best Practices
1. Always use `--no-watch --browsers=ChromeHeadless` for CI-style execution
2. Test behavior, not implementation details
3. Name tests descriptively — they are specifications
4. Mock at boundaries (HTTP, external services), not between internal functions
5. Follow Arrange-Act-Assert pattern
