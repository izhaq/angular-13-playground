# Migration Guide — `system-experiments` → Host Project

How to lift the `system-experiments` Angular feature out of this playground
and drop it into a host Angular application with minimum surgery.

The feature was built **migration-portable from day one**. The known
seams (UI primitives, design tokens, URL config, WebSocket factory, domain
vocabulary) are all behind explicit boundaries you replace at the host.
This guide enumerates each seam and the order to address them.

---

## 0. What you're migrating

A self-contained Angular feature that ships:

- One smart shell (`SystemExperimentsShellComponent`).
- Two boards (Primary / Secondary) with their own `Board*Service`,
  `*-form`, fields, options, columns.
- Five dumb components (`board`, `cmd-section`, `status-grid`,
  `board-footer`, `*-form`).
- Two services (`SystemExperimentsApiService`,
  `SystemExperimentsDataService`).
- A wire contract (`api-contract.ts`) + a wire normalizer
  (`grid-normalizer.ts`).
- Shared models / labels / option values / ids.
- One `_external/` anti-corruption layer pointing at this repo's
  generic dropdown primitives.

What you are **not** migrating:

- `server/` — playground mock backend. The host project already has
  real endpoints; you wire them via DI (see §3).
- `src/app/demo/`, `src/app/pages/system-experiments/` — playground-only
  hosting and the demo route. The host renders the shell its own way.
- `src/styles/_dropdowns.scss` — feature-adjacent global Material
  override. See §4 for two replacement strategies.

---

## 1. Pre-flight checklist

Before opening the host repo:

| Check | How                                                                          |
| ----- | ---------------------------------------------------------------------------- |
| Tests green     | `npm test` passes here                                          |
| Build clean     | `npm run build` produces no warnings/errors                     |
| Spec read       | Skim [`spec.md`](./spec.md), [`field-definitions.md`](./field-definitions.md), [`plan.md`](./plan.md) so you know what the feature does and why pieces are shaped the way they are |
| Domain decision | Will the feature carry its current vocabulary (TFF / NUU / Mtr Rec / Wheel / GDL / TLL / TLR …) into the host, or rename to the host's domain? If renaming, see §6. |

---

## 2. Drop the folder in

The whole feature is one folder. Copy:

```
src/app/features/system-experiments/        →   <host>/src/app/features/system-experiments/
```

That folder is fully self-contained except for the `_external/` ACL
(addressed in §3) and global SCSS (§4). Sub-tree at a glance:

```
system-experiments/
  _external/                       ← ACL — rewrite to point at host primitives (§3)
  api/
    api-contract.ts                ← wire format. No changes if backend matches.
    api-tokens.ts                  ← InjectionTokens for URL config + WS factory
    system-experiments-api.service.ts
    system-experiments-data.service.ts
    grid-normalizer.ts
  boards/
    build-defaults.ts
    build-form-group.ts
    primary-commands/
      primary-commands.fields.ts
      primary-commands.options.ts
      primary-commands.columns.ts
      primary-commands-board.service.ts
      primary-commands-form/...
    secondary-commands/
      ...mirror of primary
  components/
    board/
    board-footer/
    cmd-section/
    status-grid/
  shared/
    ids.ts
    labels.ts
    models.ts
    option-values.ts
  system-experiments-shell/
  system-experiments.module.ts
```

Don't copy `*.spec.ts` files yet — keep them out of the host build until
§9 so you can iterate on test wiring separately.

---

## 3. Replace the anti-corruption layer

The feature uses three custom dropdown primitives (`AppDropdown`,
`AppMultiDropdown`, `AppDropdownCva`) via a single re-export file:

```
src/app/features/system-experiments/_external/ui-primitives.ts
```

This file is the **only** place the feature reaches outside its folder
for UI primitives. To migrate:

1. Identify the host project's equivalents — usually a design-system
   library (e.g. `@hostcorp/ui`, `@hostcorp/forms`) that exposes a
   single-select dropdown, a multi-select dropdown, and a CVA-friendly
   single-select dropdown.
2. Replace the contents of `_external/ui-primitives.ts` with re-exports
   of the host primitives:
   ```ts
   export { HostDropdownModule as AppDropdownModule }       from '@hostcorp/ui/dropdown';
   export { HostDropdownModule as AppDropdownCvaModule }    from '@hostcorp/ui/dropdown';
   export { HostMultiSelectModule as AppMultiDropdownModule } from '@hostcorp/ui/multi-select';
   export { HostMultiSelectComponent as AppMultiDropdownComponent } from '@hostcorp/ui/multi-select';
   export type { HostDropdownOption as DropdownOption }     from '@hostcorp/ui/dropdown';
   ```
3. Verify the **API surface** the feature expects is met by the host
   primitives — selectors, inputs, outputs, value shapes. Required:

   | Primitive                 | Selector                | Required `@Input`s            | Required `@Output`s         |
   | ------------------------- | ----------------------- | ----------------------------- | --------------------------- |
   | `AppDropdownModule`       | `app-dropdown`          | `options`, `value`, `disabled`, `testId` | `(changed)` emits string  |
   | `AppMultiDropdownModule`  | `app-multi-dropdown`    | `options`, `value` (array), `disabled`, `testId` | `(changed)` emits string[] |
   | `AppDropdownCvaModule`    | `app-dropdown` w/ CVA   | works under `formControlName` | n/a                         |

   If the host primitives use different selectors (`<host-select>`),
   either wrap them in thin presenter components inside `_external/`
   that re-export the same selector, or do a one-time selector swap in
   the feature's templates.

4. Delete `src/app/components/` from this repo — that's where the
   playground primitives live; they don't migrate.

The ACL exists exactly so the templates / TS code in the rest of the
feature **never change** when swapping primitives. If you find yourself
editing component templates to satisfy the host primitives, stop and
add a wrapper in `_external/` instead.

---

## 4. SCSS / theming

### 4.1 Global Material overrides

`src/styles/_dropdowns.scss` is the playground's Material override that
makes `<mat-select>` look like the dark-on-dark dropdown the design
calls for. Two paths:

- **Host design system already styles its dropdown primitive** (the
  common case): drop the file. The host primitives bring their own
  styles.
- **Host expects you to bring component styles**: copy
  `_dropdowns.scss` into the host's global styles (`styles.scss`) and
  rename selectors / colors to match host tokens.

### 4.2 Component SCSS — color values are deliberately hardcoded

Every feature `.scss` file uses raw hex values rather than design-token
variables. This is intentional — the feature was designed to migrate
into a host project with its own token system. To re-skin:

1. `rg '#[0-9a-fA-F]{6}' src/app/features/system-experiments` — lists
   every hex value.
2. Map each one to a host design token (e.g. `#242424` →
   `var(--surface-1)`).
3. One-pass find/replace per hex.

Common values you'll see:

| Hex       | Used for                                  |
| --------- | ----------------------------------------- |
| `#242424` | shell background (one elevation above page) |
| `#2d2d2d` | dropdown / control surface                |
| `#3a3a3a` | dropdown border                           |
| `#4a4a4a` | dividers (board, cmd-panel, sub-section)  |
| `#e6e6e6` | primary text                              |
| `#1976d2` | tab indicator (matches Material primary)  |

### 4.3 Sizing budget

The shell's SCSS comments cite a `1120 × 500` envelope budget. If the
host gives the feature a different envelope, retune the per-block
sizing in:

- `system-experiments-shell.component.scss` (chrome height, footer height, tab-body min-height)
- `board.component.scss` (left/right pane widths, gaps)
- `primary-commands-form.component.scss` and the secondary mirror
  (label column width, control column width, row padding)
- `status-grid.component.scss` (label column min-width, row min-height)

All values are documented inline. Search for `1120` / `500` / "sizing"
to find the anchor comments.

---

## 5. Module wiring at the host

The feature ships an `NgModule` with intentional gaps the host fills.

### 5.1 Import the module

```ts
import { SystemExperimentsModule } from '@host/features/system-experiments/system-experiments.module';
import { SYSTEM_EXPERIMENTS_API_CONFIG } from '@host/features/system-experiments/api/api-tokens';

@NgModule({
  imports: [
    SystemExperimentsModule,
  ],
  providers: [
    {
      provide: SYSTEM_EXPERIMENTS_API_CONFIG,
      useValue: {
        primaryPostUrl:   '/api/system-experiments/primary',
        secondaryPostUrl: '/api/system-experiments/secondary',
        getUrl:           '/api/system-experiments',
        wsUrl:            'wss://host.example.com/ws/system-experiments',
      },
    },
  ],
})
export class HostFeaturesModule {}
```

### 5.2 What is and isn't pre-provided

| Token / provider                          | Provided by feature module? | Host action                                                                                               |
| ----------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SystemExperimentsApiService`             | yes                         | nothing                                                                                                   |
| `SystemExperimentsDataService`            | yes                         | nothing                                                                                                   |
| `SYSTEM_EXPERIMENTS_WS_FACTORY`           | yes (default `webSocket()`) | override only if the host has its own socket plumbing (auth, retries, multiplexing)                       |
| `SYSTEM_EXPERIMENTS_API_CONFIG`           | **no** (intentional)        | **must provide** — see snippet above                                                                      |
| `PrimaryCommandsBoardService`             | component-scoped on shell   | nothing                                                                                                   |
| `SecondaryCommandsBoardService`           | component-scoped on shell   | nothing                                                                                                   |

### 5.3 Mount the shell

In a route or page component:

```html
<system-experiments-shell></system-experiments-shell>
```

The shell takes no inputs. It owns its own state and connects to the
backend on construction.

### 5.4 Routing

Add a lazy-loaded route:

```ts
{
  path: 'system-experiments',
  loadChildren: () =>
    import('./features/system-experiments/system-experiments.module').then(
      (m) => m.SystemExperimentsModule,
    ),
}
```

(Note: this repo's playground page module is in `src/app/pages/` and is
**not** part of the migration.)

---

## 6. Domain-term swap (optional)

If the host project uses different vocabulary (e.g. the feature is
rebranded into a different product line), use the swap script
*before* you copy:

1. Read [`domain-terms.md`](./domain-terms.md).
2. Copy `domain-terms.map.json` to a new file and fill in the `to`
   values for the terms you want renamed.
3. Run the script with `--apply` to rewrite the entire feature folder
   in-place.
4. Then perform the steps in §2–§5.

The swap covers TS symbols, HTML strings, SCSS class fragments, file
names, and folder names in one pass. See `domain-terms.md` for the CLI
reference and example end-to-end run with the pizza map.

---

## 7. Backend contract

The host backend must serve three things matching the wire types in
[`api/api-contract.ts`](../../src/app/features/system-experiments/api/api-contract.ts):

| Endpoint                     | Method | Body / Frame shape                                | Purpose                                                                       |
| ---------------------------- | ------ | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `config.getUrl`              | GET    | `SystemExperimentsResponse`                       | Initial seed of the right-hand grid                                           |
| `config.wsUrl`               | WS     | `SystemExperimentsResponse` per frame             | Live updates after the seed; replaces grid state on every frame               |
| `config.primaryPostUrl`      | POST   | `BoardPostPayload` (sides[], wheels[], fields)    | Apply on the Primary tab — fans the field set across all selected side+wheel  |
| `config.secondaryPostUrl`    | POST   | `BoardPostPayload`                                | Same for Secondary                                                            |

Things to verify against the host backend:

- **Multi-location keys** — the `MultiLocationFields` interface
  (`linkHealth` today) describes a key that can appear simultaneously in
  `MCommandItem.additionalFields`, `EntityData.aCommands`, and the flat
  `EntityData` props. The grid renders whichever subset the backend
  populates; Apply writes to all matching slots. If your backend does
  this differently (e.g. one canonical home, mirrors derived
  server-side), you can drop the multi-location list in
  `secondary-commands.fields.ts` to a single home — no other code
  changes needed.
- **GDL column** — flat props on `EntityData`; the normalizer reads
  `entities[0]` only because the backend is contracted to mirror across
  both. If your host backend doesn't mirror, change
  `grid-normalizer.ts` to read from the canonical entity.
- **Field set parity** — every key in `PrimaryStandardFields`,
  `SecondaryAdditionalFields`, `ACommandsData`, and the GDL field
  block must be present on every frame, even if its value is `''`
  (empty string renders as an empty cell, which is the design).

---

## 8. Things to verify after wire-up

| Smoke check                                                                                              |
| -------------------------------------------------------------------------------------------------------- |
| Page loads with no console errors                                                                        |
| Both tabs render; tab switch keeps CMD selection but discards unapplied form edits                       |
| Sys Mode toggle disables CMD + form + Apply (Defaults / Cancel stay enabled)                             |
| Primary grid shows 8 columns (L1..R4) with abbreviations from the backend's seed frame                   |
| Secondary grid shows 11 columns (adds TLL, TLR, GDL); GDL column reads from `entities[0]`                |
| Live frames update the grid in place without a re-render flicker (async pipe + OnPush)                   |
| WS reconnects after a network blip (3s delay, capped at 60 attempts, resets on success)                  |
| Apply on Primary fires `primaryPostUrl`; Apply on Secondary fires `secondaryPostUrl`                     |
| Apply with no Side or no Wheel selected is disabled at the button (greyed out)                           |
| Defaults resets only the active tab; the other tab's draft survives                                      |
| Cancel reverts the active tab's form to the last applied snapshot (or to defaults if never applied)      |
| Multi-select fields render in the grid as comma-joined abbreviations (no spaces)                         |

---

## 9. Tests

`*.spec.ts` files copy unchanged. They use `TestBed`, `RouterTestingModule`,
and `fakeAsync` — no host-specific fixtures.

If your host CI uses Jest instead of Karma/Jasmine, the `expect`/`spyOn`
surface is mostly compatible, but you'll need to:

- Replace `jasmine.createSpy` with `jest.fn()`.
- Replace `jasmine.SpyObj` typing with `jest.Mocked<T>`.
- Replace `tick()` from `@angular/core/testing` (works in both, but Jest
  often uses `jest.runAllTimers()` instead in async helpers).

The 138 specs cover both per-board services, both forms, the shell, the
grid normalizer, the data + api services, the cmd section, the footer,
the board layout, and the status grid. If the host build green-lights
all of them you can be confident the migration is complete.

---

## 10. Order of operations summary

```
[1] Pre-flight: tests green here, decide whether to swap domain terms
[2] (optional) Run domain-term swap on this folder before copying     ← §6
[3] Copy `src/app/features/system-experiments/` to host repo          ← §2
[4] Rewrite `_external/ui-primitives.ts` to point at host primitives  ← §3
[5] Replace SCSS hex colors with host design tokens (one-pass)        ← §4
[6] Provide `SYSTEM_EXPERIMENTS_API_CONFIG` in host module             ← §5.1
[7] Add lazy route or mount <system-experiments-shell> on a page      ← §5.4
[8] Verify backend contract matches the wire interfaces               ← §7
[9] Smoke checks                                                      ← §8
[10] Copy specs and ensure CI runs them                               ← §9
```

Total estimated effort assuming the host primitives match the ACL
contract: **half a day** to first green tab; **one day** including
spec migration and backend wire-up.

---

## Appendix A — Files that should NOT migrate

These exist only to support the playground:

```
server/                                          ← mock backend
src/app/demo/                                    ← demo page
src/app/pages/system-experiments/                ← playground hosting page
src/app/components/                              ← generic dropdown primitives (host has its own)
src/styles/_dropdowns.scss                       ← see §4.1 for replacement
specs/sys-mode-dashboard/                        ← keep these in this repo as historical record
scripts/swap-domain-terms.js                     ← keep here; one-shot tool
```

## Appendix B — Where the seams live

If you're auditing the feature for "what could I plausibly break by
migrating?", the answer is exactly these files:

```
_external/ui-primitives.ts        ← UI primitive boundary
api/api-tokens.ts                  ← URL + WS factory boundary
api/api-contract.ts                ← wire format boundary
shared/labels.ts                   ← user-facing strings (i18n boundary)
*.scss                             ← color + sizing boundary
system-experiments.module.ts       ← module + DI provider boundary
```

Everything else (`shared/`, `components/`, `boards/`,
`system-experiments-shell/`) is internal to the feature and should
need zero edits during a clean migration.
