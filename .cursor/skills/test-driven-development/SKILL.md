---
name: test-driven-development
description: Write and evolve code test-first using RED-GREEN-REFACTOR, the test pyramid, DAMP tests, real dependencies where possible, and Angular (Jasmine/Karma) plus generic TypeScript patterns. Use for new features, bug fixes, refactors, and review of test quality.
---

# Test-Driven Development (TDD)

Use this skill when implementing features, fixing bugs, or refactoring with tests as the primary design feedback loop. Prefer **small, fast, meaningful tests** over coverage theater.

## The TDD cycle (RED → GREEN → REFACTOR)

```text
        ┌─────────────┐
        │    RED      │  Write a failing test that expresses desired behavior
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │   GREEN     │  Write the minimum code to pass the test
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │  REFACTOR   │  Improve design; keep tests green
        └──────┬──────┘
               │
               └──────────────► repeat
```

1. **RED** — Add one small test that fails for the right reason (compile or assertion).
2. **GREEN** — Implement just enough to pass; resist “extra” production code.
3. **REFACTOR** — Clean up duplication and names while tests stay green.

Never skip RED: if you did not see the test fail, you have not proven it guards the behavior.

## Prove-It pattern (bugs and regressions)

When fixing a bug:

1. **Reproduce** — Write a test that fails on the buggy code (this is your RED).
2. **Fix** — Make the smallest change that turns the test green.
3. **Refactor** — If needed, simplify without changing behavior.

If you cannot write a failing test, you have not understood the bug or it is not reproducible at the test level you chose—narrow scope (unit) or widen (integration) until you can.

## Test pyramid (80 / 15 / 5)

Aim for a **stable pyramid**, not a coverage percentage:

| Tier | Rough share | Purpose |
|------|-------------|---------|
| **Unit** | ~80% | Fast feedback on logic, edge cases, branches |
| **Integration** | ~15% | Real wiring: DB, HTTP, modules, adapters |
| **End-to-end (E2E)** | ~5% | Critical user journeys, smoke paths |

Too many E2E tests → slow, flaky CI. Too many over-mocked unit tests → false confidence. Balance by **risk**: put more integration/E2E weight behind money paths and security boundaries.

## Test sizes (reference)

| Size | Scope | Speed | Isolation | Typical tools |
|------|--------|-------|-----------|----------------|
| **Unit** | Single function/class, collaborators faked or minimal | Fast | High | Jest, Jasmine, Vitest |
| **Integration** | Several real parts (e.g. service + HTTP mock, module + DB test container) | Medium | Partial | Supertest, TestBed + `HttpTestingController`, test DB |
| **E2E** | Full app or large slice, browser or API black-box | Slow | Low | Playwright, Cypress, Webdriver |

Choose the **smallest** size that still proves the behavior you care about.

## DAMP over DRY (in tests)

- **DRY** (Don’t Repeat Yourself) is great in production code.
- **DAMP** (**D**escriptive **A**nd **M**eaningful **P**hrases) is often better in tests: a little duplication improves readability and failure messages.

Prefer **clear, complete examples** in each test over clever shared setup that forces readers to hunt indirect state.

## Prefer real implementations over mocks

- Use **real** objects, in-memory fakes, or narrow test doubles when cost is low.
- Reach for **mocks/spies** when boundaries are slow, non-deterministic, or external (network, clock, filesystem).

Over-mocking couples tests to implementation details and hides integration bugs.

## Arrange–Act–Assert (AAA)

Structure each test in three phases (comments optional but helpful when non-trivial):

```typescript
it('computes total with tax', () => {
  // Arrange
  const cart = new Cart();
  cart.add({ price: 100, qty: 2 });

  // Act
  const total = cart.totalWithTax(0.1);

  // Assert
  expect(total).toBe(220);
});
```

Keep **one primary behavior** per test; multiple `expect` calls are fine when they assert **one concept** (e.g. shape + side effect of the same action).

## One assertion per concept

- Avoid testing unrelated behaviors in a single `it` (harder to name, debug, and parallelize).
- Multiple expectations that support **one logical outcome** are acceptable (e.g. status code + body for one HTTP response).

## Descriptive naming

- **`describe`**: name the **unit under test** (module, class, function).
- **`it`**: state **behavior** or **rule** under a condition — readable as a sentence with `describe`.

Good: `describe('OrderValidator')` + `it('rejects expired offers')`  
Weak: `it('works')`, `it('test1')`.

## Generic examples (Jest / TypeScript, framework-agnostic)

### Unit: pure function

```typescript
// sum.ts
export function sum(a: number, b: number): number {
  return a + b;
}

// sum.spec.ts
import { sum } from './sum';

describe('sum', () => {
  it('adds two positive numbers', () => {
    expect(sum(2, 3)).toBe(5);
  });

  it('treats negative numbers correctly', () => {
    expect(sum(-1, 1)).toBe(0);
  });
});
```

### Collaborator with a test double (when needed)

```typescript
// userService.ts
export class UserService {
  constructor(private readonly repo: { findById: (id: string) => Promise<{ id: string; name: string } | null> }) {}

  async displayName(id: string): Promise<string> {
    const user = await this.repo.findById(id);
    return user?.name ?? 'Guest';
  }
}

// userService.spec.ts
describe('UserService', () => {
  it('returns Guest when user is missing', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const svc = new UserService(repo);

    await expect(svc.displayName('missing')).resolves.toBe('Guest');
    expect(repo.findById).toHaveBeenCalledWith('missing');
  });
});
```

### Integration-style: async + error path

```typescript
describe('createInvoice', () => {
  it('rolls back when payment fails', async () => {
    const payment = { charge: jest.fn().mockRejectedValue(new Error('declined')) };
    const invoices = { insert: jest.fn() };

    await expect(createInvoice({ payment, invoices, amount: 10 })).rejects.toThrow('declined');
    expect(invoices.insert).not.toHaveBeenCalled();
  });
});
```

## Angular testing patterns (Jasmine / Karma)

Use **`TestBed`** for DI and component compilation; use **`HttpTestingController`** for HTTP; prefer **`ComponentFixture`** and `debugElement` for DOM assertions. Align with the same AAA and pyramid guidance as above.

### Component test with `TestBed`

```typescript
// Angular: Component test with TestBed
describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: jasmine.SpyObj<TaskService>;

  beforeEach(async () => {
    taskService = jasmine.createSpyObj('TaskService', ['getTasks', 'createTask']);

    await TestBed.configureTestingModule({
      declarations: [TaskListComponent],
      providers: [{ provide: TaskService, useValue: taskService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
  });

  it('displays tasks from service', () => {
    taskService.getTasks.and.returnValue(of([{ id: '1', title: 'Test' }]));
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.task-item'));
    expect(items.length).toBe(1);
  });
});
```

### Service test with `HttpClientTestingModule`

```typescript
// Angular: Service test
describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TaskService]
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches tasks from API', () => {
    const mockTasks = [{ id: '1', title: 'Test' }];
    service.getTasks().subscribe(tasks => {
      expect(tasks).toEqual(mockTasks);
    });

    const req = httpMock.expectOne('/api/tasks');
    expect(req.request.method).toBe('GET');
    req.flush(mockTasks);
  });
});
```

Imports you typically need for the snippets above: `TestBed`, `ComponentFixture`, `HttpClientTestingModule`, `HttpTestingController`, `By`, `of`, and your component/service types.

## Running tests (commands)

```bash
# Generic: Jest (example)
npx jest

# Generic: watch mode
npx jest --watch

# Angular: Run all tests
ng test --no-watch --browsers=ChromeHeadless

# Angular: Run specific test file
ng test --include='**/task.service.spec.ts' --no-watch --browsers=ChromeHeadless
```

Adjust paths and npm scripts to match the project’s `package.json` and Nx/angular workspace layout.

## Browser testing (E2E) and Playwright MCP

- Use **browser/E2E** tests for **critical journeys** and regressions that unit tests cannot credibly cover (routing, real layout, cross-cutting UX).
- When an MCP Playwright server is **configured in `.cursor/mcp.json`**, prefer it for driving browsers from the agent: inspect available MCP tools, follow each tool’s schema, and run flows against your local or preview environment.
- Keep E2E **short, deterministic, and parallel-safe**; avoid arbitrary `sleep`—use explicit waits/conditions supported by your runner.

### Subagent pattern (browser work)

When browser automation is heavy or easy to get wrong:

1. **Main agent** — Owns product behavior, test plan, and which journeys are E2E-worthy.
2. **Browser subagent** — Executes Playwright MCP (or project E2E scripts), captures traces/screenshots on failure, returns minimal repro steps.
3. **Merge** — Promote stable checks into committed E2E specs; delete one-off exploratory scripts if not valuable.

This keeps the planning loop fast while still grounding UI claims in real browser runs.

## Anti-patterns (tests)

| Anti-pattern | Why it hurts | Prefer |
|--------------|--------------|--------|
| Testing implementation details | Refactors break tests | Assert observable outcomes (return values, DOM, public API) |
| Giant `beforeEach` | Hidden state, unclear failures | Local arrange in each test or small focused helpers |
| Mocking everything | False confidence | Real instances, fakes, or narrow spies |
| Flaky timing | Erodes trust | Deterministic waits, fake timers, stable fixtures |
| Duplicate E2E for every branch | Slow CI | Unit/integration for branches; E2E for journeys |
| Asserting on log side effects only | Brittle | Prefer user-visible or API contract assertions |

## Anti-rationalization (when you want to skip TDD)

| Excuse | Response |
|--------|----------|
| “Too small to test” | Small bugs still waste time; one test often pays for itself |
| “I’ll test after” | “After” rarely happens; design feedback arrives too late |
| “Tests slow me down” | Un-tested code slows **everyone** down in review and production |
| “Hard to test = bad design” | Listen to that signal—extract seams, inject dependencies |
| “E2E covers it” | E2E is the tip of the pyramid; it cannot replace fast tests |

## Red flags (stop and correct course)

- New logic with **no failing test** first (for new behavior) or **no regression test** (for bugs).
- Tests that **never failed** on the machine where they were written.
- **Intermittent** failures accepted as “flaky tests” without investigation.
- Mocks that **mirror** production code line-for-line (tests prove nothing).
- **Coverage targets** without reading failing assertions or meaningful scenarios.

## Verification checklist

Before you call a task done:

- [ ] **RED seen** — New or updated test failed before the fix/feature.
- [ ] **GREEN** — Full relevant suite passes locally (unit + targeted integration/E2E as appropriate).
- [ ] **REFACTOR** — Names and structure read well; no obvious duplication in production code.
- [ ] **Pyramid** — Right tier for the risk; not everything is E2E, not everything over-mocked.
- [ ] **Readable** — `describe`/`it` names state intent; AAA is obvious.
- [ ] **Deterministic** — No order dependence, no real network unless explicitly an integration test.
- [ ] **Bug fix** — Prove-It: failing test reproduces the bug, then passes after fix.

---

**Summary:** Lead with a failing test, implement minimally, refactor safely. Prefer DAMP, meaningful names, and real collaborators where cheap. Put most tests at the bottom of the pyramid; use browser/E2E and **Playwright MCP** (when configured in `.cursor/mcp.json`) deliberately for high-value journeys.
