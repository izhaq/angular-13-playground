# HTML bidi patterns

Use these patterns when markup mixes languages or when text direction is not known in advance.

## 1. Set page direction explicitly

```html
<html lang="en" dir="ltr">
```

```html
<html lang="he" dir="rtl">
```

## 2. Wrap known opposite-direction phrases tightly

```html
<p>
  Read
  <span lang="ar" dir="rtl">هذا المقال</span>
  today.
</p>
```

## 3. Nest mixed phrases according to real structure

```html
<p>
  The title is
  <cite dir="rtl" lang="ar">مقدمة إلى <span dir="ltr">CSS</span></cite>
</p>
```

## 4. Use `dir="auto"` for unknown-direction values when a wrapper already exists

```html
<li><span dir="auto">{{ item.label }}</span></li>
```

## 5. Use `<bdi>` for injected inline text with no existing wrapper

```html
<p><bdi>{{ customerName }}</bdi> – 12 reviews</p>
```

## 6. Isolate names and numbers separately when needed

```html
<li>
  <bdi>{{ reviewerName }}</bdi>
  <bdi>{{ reviewCount }}</bdi>
</li>
```

## 7. Use explicit direction for fields that must stay LTR

```html
<label for="email">Email</label>
<input id="email" type="email" dir="ltr" inputmode="email" />
```

## 8. Prefer semantic wrappers over extra spans when possible

Good:

```html
<cite dir="rtl" lang="ar">كتاب</cite>
```

Less ideal when a semantic element already exists:

```html
<cite><span dir="rtl" lang="ar">كتاب</span></cite>
```

## 9. Use `bdo` only for true override cases

`bdo` is rare. It is not the normal solution for mixed-direction UI copy.

```html
<bdo dir="ltr">ABC-123</bdo>
```
