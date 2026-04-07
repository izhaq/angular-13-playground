# CSS logical properties quick map

Use this file when converting physical CSS to direction-aware CSS.

## Spacing

| Avoid | Prefer |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `margin: 0 16px 0 8px` | `margin-block: 0; margin-inline: 16px 8px;` only when the logical intent is clear |

## Borders

| Avoid | Prefer |
|---|---|
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `border-top` | `border-block-start` |
| `border-bottom` | `border-block-end` |

## Positioning

| Avoid | Prefer |
|---|---|
| `left` | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `top` | `inset-block-start` |
| `bottom` | `inset-block-end` |

## Size

| Avoid | Prefer when direction-aware sizing is helpful |
|---|---|
| `width` | `inline-size` |
| `height` | `block-size` |
| `min-width` | `min-inline-size` |
| `max-width` | `max-inline-size` |

## Alignment and values

| Avoid | Prefer |
|---|---|
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |
| physical corner assumptions | logical start/end corner reasoning |

## Example migration

Before:

```css
.card {
  padding-left: 16px;
  padding-right: 24px;
  margin-left: auto;
  text-align: left;
}

.card__badge {
  position: absolute;
  right: 12px;
  top: 8px;
}
```

After:

```css
.card {
  padding-inline-start: 16px;
  padding-inline-end: 24px;
  margin-inline-start: auto;
  text-align: start;
}

.card__badge {
  position: absolute;
  inset-inline-end: 12px;
  inset-block-start: 8px;
}
```

## Important note

Logical conversion is not purely mechanical. Check whether the original code was expressing:

- semantic start/end intent
- a fixed physical screen position
- a product-specific visual rule that should not mirror

Only mirror the first category by default.
