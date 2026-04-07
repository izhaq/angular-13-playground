---
name: rtl-bidi-ui
description: creates, reviews, and refactors html and css so ui works correctly in both rtl and ltr contexts. use when generating components, pages, templates, forms, navigation, tables, cards, design-system styles, or mixed-direction content that must support arabic, hebrew, english, spanish, and future locales without left/right assumptions.
compatibility:
  - html
  - css
  - javascript
  - typescript
  - react
  - vue
  - angular
  - svelte
license: CC-BY-4.0
metadata:
  tags:
    - rtl
    - bidi
    - i18n
    - l10n
    - css-logical-properties
    - html
    - accessibility
    - design-system
  version: 1.0.0
  scope: ui-authoring-and-review
disable-model-invocation: false
---

# RTL and bidirectional UI authoring

Use this skill to create new markup, audit existing code, refactor legacy code, and explain bidirectional issues in HTML and CSS.

Treat bidi support as a first-class layout requirement, not a final flip step. Generate code that works in both directions from the start.

## Default goals

1. Make the UI correct in both `ltr` and `rtl`.
2. Prefer one shared code path over separate LTR and RTL stylesheets.
3. Use semantic HTML and direction-aware CSS.
4. Preserve readability for mixed content such as names, SKUs, emails, numbers, dates, currencies, and code.
5. Avoid visual hacks that break when direction changes.

## Core workflow

1. Identify the task type:
   - **Creating new UI** -> follow the creation workflow.
   - **Reviewing or debugging existing UI** -> follow the audit workflow.
   - **Refactoring legacy code** -> follow the migration workflow.
   - **Explaining bidi behavior** -> follow the explanation workflow.
2. Check whether direction is page-level, component-level, or string-level.
3. Apply the minimum correct direction semantics in HTML first.
4. Use logical CSS properties and logical alignment values.
5. Inspect mixed-direction strings and dynamic content separately.
6. Return code plus a short bidi rationale and any remaining risks.

## Non-negotiable rules

- Set base direction in markup, not by visually reversing the layout.
- Prefer the `dir` attribute in HTML for document or component direction.
- Use `lang` whenever language is known.
- Prefer logical CSS properties over physical left/right properties.
- Prefer `start` and `end` values over `left` and `right`.
- Wrap opposite-direction inline phrases tightly.
- Use `dir="auto"` or `<bdi>` for user-generated or unknown-direction inline text.
- Keep DOM order aligned with reading and tab order. Do not use CSS to fake semantic order.
- Do not solve RTL with `transform: scaleX(-1)` or similar mirroring hacks.
- Do not duplicate whole components into separate LTR and RTL markup unless explicitly required.

## Creation workflow

When creating new code:

1. Add `lang` and `dir` at the correct scope.
2. Build layout using flex, grid, and logical spacing.
3. Use logical sizing and offsets where relevant.
4. For icons, chevrons, arrows, drawers, pagination, breadcrumbs, and step flows, decide explicitly what should mirror and what should not.
5. For text fields and dynamic inline content, protect mixed-direction content with `dir="auto"` or `<bdi>`.
6. Return a concise checklist of bidi-sensitive decisions.

## Audit workflow

When reviewing existing code:

1. Look for physical properties such as `margin-left`, `padding-right`, `left`, `right`, `border-left`, `text-align: left`, and directional transforms.
2. Look for hardcoded icon directions or left/right wording in classes and variables.
3. Check forms, tables, breadcrumbs, badges, chips, toasts, dialogs, nav bars, and carousels.
4. Check whether mixed-direction strings break punctuation, numbers, names, or inline labels.
5. Report findings in this order:
   - **Critical bidi bugs**
   - **CSS migration fixes**
   - **Markup fixes**
   - **Optional cleanup**
6. Provide corrected code, not just commentary, unless the user asks for review only.

## Migration workflow

When refactoring legacy code:

1. Preserve behavior while replacing physical CSS with logical CSS.
2. Remove one-off RTL overrides when shared logical CSS can replace them.
3. Rename ambiguous utilities if needed, but prefer minimal churn.
4. Highlight places where design tokens should expose direction-safe abstractions.
5. If a full migration is large, stage it into:
   - base semantics
   - spacing and alignment
   - positioning and overlays
   - icons and motion
   - mixed-content fixes

## Explanation workflow

When the user asks why something breaks:

1. Explain the issue in terms of base direction, inline direction, isolation, or physical-vs-logical CSS.
2. Show the smallest broken example.
3. Show the corrected example.
4. State the principle that generalizes to future code.

## HTML rules

### Document and section direction

- In generic HTML documents, put the default direction on the root element whenever possible.
- Generic example:

```html
<html lang="en" dir="ltr">
```

or

```html
<html lang="ar" dir="rtl">
```

- **HiBob-specific:** In this repository, do not set `<html lang=... dir=...>` directly from individual components or pages. Application-level `lang` and `dir` are managed centrally (e.g., `LangService` sets `document.documentElement.lang` and `document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr'`). Components should rely on this and only set `dir` on local containers when they intentionally differ from the app direction.
- If a component or embedded region differs from the page direction, set `dir` on the nearest meaningful container.
- For direction-sensitive logic, prefer using the shared `isRTL(lang)` helper instead of custom RTL detection.
- Do not rely on CSS `direction` alone for document semantics.

### Language metadata

- Use `lang` on the document and on language switches inside content. In this repo, the top-level document `lang` is controlled by `LangService`; components should only set `lang` on nested elements when mixing languages inside content.
- If a string is Arabic in an English page, prefer a local wrapper such as:

```html
<span lang="ar" dir="rtl">مرحبا</span>
```

### Inline mixed-direction content

- Tightly wrap opposite-direction phrases.
- If direction is known, use an element with explicit `dir`.
- If direction is unknown at author time, use `dir="auto"` on an existing wrapper or wrap the string in `<bdi>`.
- For nested opposite-direction phrases, nest wrappers to reflect actual text structure.

Good:

```html
<p>
  The title is
  <cite dir="rtl" lang="ar">مقدمة إلى <span dir="ltr">CSS</span></cite>
</p>
```

Good for unknown user content:

```html
<p><bdi>{{ displayName }}</bdi> – 3 reviews</p>
```

### Forms and inputs

- Use the surrounding document or section direction by default.
- For inputs that may contain unknown-direction values, prefer `dir="auto"`.
- Consider whether data should stay LTR regardless of locale, such as email, URLs, product codes, or source code.
- For those fields, use explicit direction only when the product requirement is clear.

Example:

```html
<input type="text" name="nickname" dir="auto" />
<input type="email" name="email" dir="ltr" inputmode="email" />
```

### Tables and data display

- Use semantic `<table>` markup for tabular data.
- Test numeric columns, mixed-language names, and punctuation in both directions.
- Do not assume the first visual column is always the logical start for every locale.
- If table meaning depends on chronology or progression, confirm whether the product wants visual mirroring or preserved order.

## CSS rules

### Always prefer logical properties

Prefer these patterns:

- `margin-inline-start` instead of `margin-left`
- `margin-inline-end` instead of `margin-right`
- `padding-inline` instead of `padding-left` and `padding-right`
- `border-inline-start` instead of `border-left`
- `inset-inline-start` instead of `left`
- `inline-size` instead of `width` when direction-aware sizing is desired
- `text-align: start` instead of `text-align: left`
- `justify-content: start` or `end` semantics where available

Avoid shipping new code with physical left/right CSS unless there is a deliberate, documented visual reason.

### Layout systems

- Prefer flexbox and grid with logical gaps and alignment.
- Think in **inline** and **block** axes, not left and right.
- Avoid absolute positioning tied to `left` or `right` when a logical inset works.
- Avoid custom per-locale spacing overrides when logical spacing solves the problem.

### Positioning

Good:

```css
.badge {
  inset-inline-end: 0;
  inset-block-start: 0;
}
```

Avoid:

```css
.badge {
  right: 0;
  top: 0;
}
```

### Alignment

Good:

```css
.card__title {
  text-align: start;
}
```

Avoid:

```css
.card__title {
  text-align: left;
}
```

### Borders, radii, and corners

- Prefer logical border and radius properties where available.
- Be careful with asymmetric pills, speech bubbles, drawers, and attached panels.
- If the shape implies direction, verify the mirrored corner treatment explicitly.

### Motion and transforms

- Check animations, transitions, swipes, and enter/exit motions for direction assumptions.
- Mirror directional motion only when the interaction metaphor should mirror.
- Do not mirror charts, media controls, or brand marks unless product requirements say so.

### Icons and imagery

Mirror only assets whose meaning is directional in context.

Usually mirror after product review:
- back and forward chevrons
- breadcrumb separators when styled directionally
- next and previous arrows
- drawer or panel reveal affordances

Usually do not mirror by default:
- logos
- photos
- charts with real-world orientation
- video play icons unless the design system explicitly does so
- code snippets and syntax illustrations

## Component-specific guidance

### Navigation

- Primary navigation should follow document direction naturally.
- Test active indicators, dropdown alignment, and submenu placement.
- Breadcrumbs need explicit review because separator direction and reading order are easy to break.

### Dialogs, popovers, menus, and tooltips

- Use logical anchoring and placement rules.
- Check close buttons, back buttons, and footer actions.
- Keep action order semantically intentional; do not reverse destructive and confirm actions blindly.

### Forms

- Labels, helper text, validation text, prefixes, suffixes, and icons must be tested in both directions.
- Prefixes and suffixes around numbers or currencies often need isolation.
- Placeholder text must not be the only bidi signal.

### Lists, timelines, steppers, carousels

- Decide whether progress should mirror visually or preserve chronological direction.
- Make that choice explicit in code comments when it is product-specific.

## Dynamic-content rules

Treat these as bidi-sensitive by default:

- person names
- company names
- addresses
- emails
- usernames
- SKUs and serials
- URLs and file paths
- currencies
- date ranges
- phone numbers
- scores and counts attached to names

If such strings are inserted inline into translated sentences, isolate them.

## Accessibility and semantics

- Preserve DOM order that matches reading order and keyboard order.
- Do not use visual reversal to compensate for incorrect HTML direction.
- Ensure screen-reader labels and visible labels remain aligned.
- Keep punctuation and separators meaningful after localization.

## Output format

Unless the user asks otherwise, respond with:

1. **Summary** — one short paragraph.
2. **Updated code** — corrected HTML/CSS or component code.
3. **Bidi notes** — 3 to 7 bullets describing what changed.
4. **Risk check** — list any unresolved items needing product or localization confirmation.

For review-only requests, use:

1. **Critical bidi bugs**
2. **Why they break**
3. **Recommended fix**
4. **Patched example**

## Preferred review language

Use direct, implementation-focused wording. Prefer:

- "set base direction on the nearest semantic wrapper"
- "replace physical spacing with logical spacing"
- "isolate injected inline content"
- "use start/end alignment values"
- "test this component with Arabic, Hebrew, English, and numeric mixed strings"

Avoid vague advice such as "make it RTL friendly" without concrete code changes.

## Reference files

Read these only when needed:

- For quick checks and acceptance criteria: `references/rtl-checklist.md`
- For physical-to-logical CSS migration patterns: `references/css-logical-properties.md`
- For markup patterns and mixed-direction strings: `references/html-bidi-patterns.md`
- For expected response structure and examples: `references/review-template.md`

