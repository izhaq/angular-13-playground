# Code Review Preferences

This document defines code review preferences for this repository. These rules prioritize practical, repository-specific patterns over generic best practices. The stack is **Angular 13** and **Angular Material 13**.

---

## 1. Design Fidelity — Match Design Specs Exactly

**Rule:** Remove any features, UI elements, or data fields that are not explicitly shown in the Figma or design specification.

**Examples:**

- If the design does not show a “Cycle type” field, do not ship it in the UI.
- Do not add “nice-to-have” extras that are not in the spec.

**When reviewing:** Confirm that visible UI and copy align with the design. Flag additions that are not in the spec.

---

## 2. Avoid Creating New Utilities — Search First

**Rule:** Before adding pipes, utilities, or helpers, confirm nothing suitable already exists.

**Checklist:**

- Search the codebase for pipes, services, and helpers that solve the same problem.
- Prefer **Angular built-ins** (e.g. `DatePipe`, `DecimalPipe`, `AsyncPipe`) where they fit.
- Reuse **third-party** libraries already in the project.
- Add new code only when nothing existing is appropriate.

**Example:**

- Do not add a custom date pipe if an existing service or shared formatter already covers the use case.

**When reviewing:** Ask whether the same behavior already exists elsewhere in the app.

---

## 3. CSS Discipline — Overrides With Care

**Rule:** Avoid `!important` and keep `::ng-deep` rare. Understand defaults before overriding.

**Guidelines:**

1. **Avoid `!important`** — Prefer specificity, structure, or theme/CSS variables.
2. **Minimize `::ng-deep`** — Use only when you must reach into a child component’s template and there is no supported API; prefer encapsulation-friendly alternatives where possible.
3. **Check base styles first** — Read Material and your global styles before layering overrides.
4. **Prefer CSS variables** — Use theme/custom properties when the design system or Angular Material exposes them.
5. **Compare before overriding** — Override only what actually differs from the default.

**Angular Material 13 examples:**

- Prefer adjusting layout in the template (e.g. wrapping in a styled host) before deep-piercing into `mat-form-field` internals.
- If you need dialog width, set it in **`MatDialogConfig`** (`width`, `maxWidth`, `height`, `panelClass`) instead of fighting the overlay with brittle selectors.

**When reviewing:** Question unnecessary overrides, `!important`, and broad `::ng-deep` usage.

---

## 4. Configuration Over CSS — Use Component and Material APIs

**Rule:** Prefer public APIs, inputs, and configuration objects over CSS that duplicates behavior Material already exposes.

**Guidelines:**

1. **Use Material configuration** — e.g. `MatDialog.open(component, { width: '480px', maxWidth: '95vw', panelClass: 'my-panel' })` instead of relying on deep selectors to force dimensions.
2. **Use component inputs** — e.g. `mat-form-field` `appearance`, `floatLabel`, `hideRequiredMarker`; `mat-button` `color`, `disabled`; table `matSort`, paginator `pageSizeOptions`, etc., as documented for Angular Material 13.
3. **Follow this repo’s patterns** — If similar features use the same dialog sizes, form `appearance`, or shared wrapper components, match them.

**When reviewing:** Flag CSS used to fake something that `MatDialogConfig`, theme tokens, or component `@Input()`s already support.

---

## 5. Repository Pattern Consistency

**Rule:** Follow patterns already used in this project, even when that means a small deviation from a pixel-perfect design mock.

**Guidelines:**

1. **Mirror similar features** — See how dialogs, tables, forms, and navigation are done in the same area of the app.
2. **Reuse shared enums/constants** — Prefer existing width tokens, route keys, or feature flags over one-off literals.
3. **Consistency over perfection** — A few pixels’ difference is acceptable if it matches established dialog widths, spacing rhythm, or component wrappers.

**When reviewing:** Check whether the change breaks an established pattern in the module or app.

---

## 6. Error Handling — Defensive but Simple

**Rule:** Guard operations that can fail (parsing, formatting, optional data), without building heavy validation layers for data you already treat as trusted.

**Guidelines:**

1. **Use try/catch** where failure is possible (e.g. date parsing, JSON, mapping).
2. **Simple fallback** — e.g. return the raw value, show a safe default, or skip optional UI.
3. **Do not over-engineer** — No elaborate error frameworks for straightforward formatting.

**Example:**

```typescript
try {
  return this.formatDate(this.data.snapshotDate);
} catch {
  return this.data.snapshotDate;
}
```

**When reviewing:** Ensure risky operations have a minimal safety net; avoid noisy or redundant error machinery.

---

## 7. Accept Existing Patterns

**Rule:** Do not refactor for theoretical purity when the codebase already settled on a pattern.

**Guidelines:**

1. **Do not refactor for perfection** in the same PR as a feature fix if similar components already use the older style.
2. **Consistency beats ideal patterns** — Matching neighboring components is often the right call.

**When reviewing:** Distinguish between real defects and stylistic preferences that diverge from local convention.

---

## 8. Use Predefined Variables — Typography, Spacing, Color

**Rule:** Use the project’s SCSS variables, mixins, and spacing scale for typography, spacing, and colors instead of scattering raw numbers.

**Guidelines:**

1. **Typography** — Map font size, weight, and line height to shared variables or theme typography levels rather than ad hoc `px`/`rem` unless the design system documents an exception.
2. **Spacing** — Use the repository’s spacing scale (variables, mixins, or agreed utility classes) instead of arbitrary `margin: 13px`-style values.
3. **Color** — Prefer palette/theme variables over one-off hex values where a token exists.
4. **Discover before hardcoding** — Check `_variables.scss`, theme partials, or shared style entry points for existing names.

**Angular Material 13 context:** Prefer theme customization (palette, typography, density) and documented CSS custom properties from your Material theme over duplicating Material colors in unrelated components.

**When reviewing:** Flag magic numbers where a project variable or theme token should be used.

---

## Review Checklist

When reviewing a change, ask:

1. Does it match the design spec exactly (no extra UI or fields)?
2. Are we adding new utilities when existing code or Angular/Material already covers this?
3. Are we using hardcoded values where SCSS variables or theme tokens exist?
4. Is `!important` avoided?
5. Is `::ng-deep` minimal and justified?
6. Are we avoiding overrides of defaults that are already correct?
7. Are we using component and Angular Material APIs instead of CSS hacks where possible?
8. Does it follow existing repository patterns (dialogs, forms, tables, routing)?
9. Is there simple error handling for operations that could fail?

---

## Priority Order

1. **Design fidelity** — Match the spec; remove what is not in the design.
2. **Repository patterns** — Align with how this app already solves the same problems.
3. **Use existing code** — Reuse pipes, services, and libraries before adding new helpers.
4. **Use predefined variables** — Typography, spacing, and color via the project’s SCSS/theme system.
5. **Minimize overrides** — APIs and variables before `!important`, deep piercing, and redundant CSS.
6. **Simple error handling** — Small, clear fallbacks for fragile operations.
