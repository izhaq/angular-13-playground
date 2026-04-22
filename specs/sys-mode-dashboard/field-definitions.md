# Engine Simulator Dashboard — Field Definitions

Referenced from [spec.md](./spec.md). This document defines every field per board, its dropdown type, options, default value, and grid mapping.

**Legend:**
- **Type**: `single` = single-select dropdown, `multi` = multi-select dropdown
- **Default**: the value used when the form is reset via the Defaults button
- **Abbr**: abbreviation displayed in grid cells (compact display)
- **Grid Cols**: which grid columns this field's values populate

---

## Layout Recap

Each board has **two visual columns**:

```
┌──────────────────────────────┬──────────────────────────────────────────┐
│ FORM (left)                  │ GRID (right)                              │
│ Label + Dropdown             │ RowLabel │ L1 │ L2 │ L3 │ L4 │ R1 │ R2 │
│ Label + Dropdown             │ RowLabel │    │    │    │    │ N  │ N  │
│ ...                          │ ...                                      │
└──────────────────────────────┴──────────────────────────────────────────┘
```

- **Footer**: Defaults + Cancel + Apply (sticky bottom).
- **Grid cells** display the `abbr` (shortcut) of values — not full labels.
- **Grid styling**: white background, vertical + horizontal cell borders, column hover effect, cell click selection.
- Each form field row is vertically aligned with its corresponding grid row.

---

## Shared: CMD Section (Both Boards)

Appears as the sticky top row.

| #  | Field          | Type    | Options     | Default   | Notes                                      |
|----|----------------|---------|-------------|-----------|--------------------------------------------|
| 1  | Selected Side  | `multi` | Left, Right | *(none)*  | Maps to entity 0 (Left) / entity 1 (Right) |
| 2  | Selected Wheel | `multi` | 1, 2, 3, 4  | *(none)*  | Maps to column index within each side      |

CMD selection is shared across tabs. The CMD dropdowns visually persist when switching tabs. What gets lost when switching without clicking Apply is the tab-specific form field selections.

---

## Primary Commands ("System Commands" tab)

**Grid: 8 columns** (L1, L2, L3, L4, R1, R2, R3, R4)

All main fields map to `mCommands[*].standardFields` in the WebSocket/GET response. Each form field has a corresponding row in the grid (except "Cmd to GS" fields — see below).

### Main Fields

Each field has a corresponding grid row, populating all 8 columns (L1–R4).

| # | Field Name | Type | Options (Value / Label / Abbr) | Default | Grid Cols |
|---|-----------|------|-------------------------------|---------|-----------|
| 1 | TFF | `single` | `not_active` / Not Active / NACV, `light_active` / Light Active / LACV, `dominate` / Dominate / DMN | Not Active | L1–R4 (all 8) |
| 2 | MLM transmit | `single` | `no` / No / No, `yes` / Yes / Yes | No | L1–R4 (all 8) |
| 3 | Video rec | `single` | `internal` / Internal / Int, `external` / External / EXT | Internal | L1–R4 (all 8) |
| 4 | Video Rec Type | `multi` | `no` / No / No, `ir` / Infra Red / IRD, `4k` / 4K / 4k, `hdr` / HDR / HDR | No | L1–R4 (all 8) |
| 5 | Mtr Rec | `single` | `no` / No / No, `yes` / Yes / Yes | No | L1–R4 (all 8) |
| 6 | Speed PWR On/Off | `single` | `on` / On / ON, `off` / Off / OFF | On | L1–R4 (all 8) |
| 7 | Force TTL | `single` | `normal` / Normal / N, `forced` / FORCED / FRC | Normal | L1–R4 (all 8) |
| 8 | NUU | `single` | `no` / No / No, `yes` / Yes / Yes | No | L1–R4 (all 8) |
| 9 | MU dump | `single` | `no` / No / No, `yes` / Yes / Yes | No | L1–R4 (all 8) |
| 10 | Send Mtr TSS | `single` | `no` / No / No, `yes` / Yes / Yes | No | L1–R4 (all 8) |
| 11 | Abort | `single` | `no` / No / No, `yes` / Yes / Yes | No | L1–R4 (all 8) |

### "Cmd to GS" Sub-Section (Excluded from Grid)

These fields appear in the form only — they do **not** have a corresponding grid row.

| # | Field Name | Type | Options | Default | Grid Cols |
|---|-----------|------|---------|---------|-----------|
| 12 | Teo | `single` | `no` / No, `yes` / Yes | No | *(none)* |
| 13 | Mtr Rec | `single` | `no` / No, `yes` / Yes | No | *(none)* |
| 14 | Ai Mtr Rec | `single` | `no` / No, `yes` / Yes | No | *(none)* |

---

## Secondary Commands ("Failure & Antenna" tab)

**Grid: 11 columns** (L1, L2, L3, L4, R1, R2, R3, R4, TLL, TLR, GDL)

All form fields have a corresponding grid row. Fields map to three different wire-format slots:

| Wire slot | Where it lives | Drives grid columns |
|---|---|---|
| `mCommands[col].additionalFields` | per-column on each entity | L1–R4 (first 8) |
| `aCommands` | per-entity (left → TLL, right → TLR) | TLL + TLR |
| flat on `EntityData` (no wrapper) | per-entity (duplicated; we read `entities[0]`) | GDL |

### Fields → First 8 Columns (from `additionalFields`)

| # | Field Key | Field Name | Type | Options (Value / Label / Abbr) | Default | Grid Cols |
|---|-----------|------------|------|-------------------------------|---------|-----------|
| 1 | `whlCriticalFail` | Wheel Critical Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | L1–R4 (8) |
| 2 | `whlWarningFail`  | Wheel Warning Fail  | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | L1–R4 (8) |
| 3 | `whlFatalFail`    | Wheel Fatal Fail    | `single` | `no` / No / NO, `yes` / Yes / YES | No | L1–R4 (8) |

### Fields → TLL + TLR Columns (from `aCommands`)

| # | Field Key | Field Name | Type | Options (Value / Label / Abbr) | Default | Grid Cols |
|---|-----------|------------|------|-------------------------------|---------|-----------|
| 4 | `tlCriticalFail` | TL Critical Fail    | `single` | `no` / No / NO, `yes` / Yes / YES | No | TLL, TLR (2) |
| 5 | `masterTlFail`   | Master TL Fail      | `single` | `on` / On / ON, `off` / Off / OFF | On | TLL, TLR (2) |
| 6 | `msTlFail`       | MSs TL Fail         | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | TLL, TLR (2) |
| 7 | `tlTempFail`     | TL Temp Fail        | `single` | `no` / No / NO, `yes` / Yes / YES | No | TLL, TLR (2) |
| 8 | `tlToAgCommFail` | TL to AGM Comm Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | TLL, TLR (2) |

### Fields → GDL Column (flat on `EntityData`, side-independent)

GDL is a single column. The 6 fields below sit **directly on `EntityData`** — there's no `gdl` wrapper on the wire. Backend duplicates them across both entities for symmetry; the grid reads from `entities[0]`.

| # | Field Key | Field Name | Type | Options (Value / Label / Abbr) | Default | Grid Cols |
|---|-----------|------------|------|-------------------------------|---------|-----------|
|  9 | `gdlFail`        | GDL Fail          | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |
| 10 | `gdlTempFail`    | GDL Temp Fail     | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |
| 11 | `antTransmitPwr` | Ant Transmit Pwr  | `single` | `auto` / Auto / ATU, `manual` / Manual / MNL | Auto | GDL (1) |
| 12 | `antSelectedCmd` | Ant Selected Cmd  | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |
| 13 | `gdlTransmitPwr` | GDL Transmit Pwr  | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |
| 14 | `uuuAntSelect`   | UUU Ant Select    | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |

---

## Grid Column Definitions

### Primary — 8 Columns

| Index | Key | Label | Side |
|-------|-----|-------|------|
| 0 | `left1` | L1 | Left |
| 1 | `left2` | L2 | Left |
| 2 | `left3` | L3 | Left |
| 3 | `left4` | L4 | Left |
| 4 | `right1` | R1 | Right |
| 5 | `right2` | R2 | Right |
| 6 | `right3` | R3 | Right |
| 7 | `right4` | R4 | Right |

### Secondary — 11 Columns

| Index | Key | Label | Side | Notes |
|-------|-----|-------|------|-------|
| 0 | `left1` | L1 | Left | |
| 1 | `left2` | L2 | Left | |
| 2 | `left3` | L3 | Left | |
| 3 | `left4` | L4 | Left | |
| 4 | `right1` | R1 | Right | |
| 5 | `right2` | R2 | Right | |
| 6 | `right3` | R3 | Right | |
| 7 | `right4` | R4 | Right | |
| 8 | `tll` | TLL | Left  | Fields 4–8 populate this column (from left entity's `aCommands`) |
| 9 | `tlr` | TLR | Right | Fields 4–8 populate this column (from right entity's `aCommands`) |
| 10 | `gdl` | GDL | —     | Fields 9–14 populate this column (from `entities[0]`'s flat GDL props) |

---

## Grid Update Example

**User selects:** Side = [Left, Right], Wheel = [2, 4], then clicks Apply.

**Grid columns updated:**
- Left side, wheel 2 → column L2 (index 1)
- Left side, wheel 4 → column L4 (index 3)
- Right side, wheel 2 → column R2 (index 5)
- Right side, wheel 4 → column R4 (index 7)

**Grid rows updated:** All rows — each row corresponds to one form field. Cell values show the `abbr` of the selected option (or default if unchanged).

---

## Open Questions

1. **Any fields scrolled out of view** — were there more fields below what the screenshots show?
