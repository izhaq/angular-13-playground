# RTL/Bidi checklist

Use this as the acceptance checklist before returning an answer.

## Semantics

- Root or nearest container has correct `dir`.
- `lang` is set when language is known.
- Direction is not being faked with CSS transforms.
- DOM order matches reading and tab order.

## Inline text

- Opposite-direction phrases are tightly wrapped.
- Unknown-direction inline values use `dir="auto"` or `<bdi>`.
- Nested mixed-direction phrases are nested in markup.
- Numbers, punctuation, and names were tested.

## CSS

- No new `left` or `right` properties unless explicitly justified.
- No new `margin-left`, `margin-right`, `padding-left`, `padding-right`, `border-left`, or `border-right` in direction-sensitive code.
- Alignment uses `start` and `end` where appropriate.
- Positioning uses logical insets where appropriate.
- Spacing uses logical properties where appropriate.

## Components

- Navigation and breadcrumbs checked.
- Forms and validation states checked.
- Tables and numeric columns checked.
- Dialogs, drawers, menus, and anchored overlays checked.
- Directional icons and motion reviewed intentionally.

## Dynamic content

- User names and titles isolated when inserted inline.
- Emails, URLs, and codes handled intentionally.
- Date ranges, currency strings, and score labels tested.

## Final output

- Return corrected code.
- Explain the bidi principle behind the fix.
- Mention any unresolved product decisions.
