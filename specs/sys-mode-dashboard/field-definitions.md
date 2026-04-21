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

## Board 1 — System Commands

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

## Board 2 — Failure & Antenna Controls

**Grid: 11 columns** (L1, L2, L3, L4, R1, R2, R3, R4, TLL, TLR, GDL)

All form fields have a corresponding grid row. Fields map to different parts of the response:
- Fields on **first 8 columns** (L1–R4): from `mCommands[*].additionalFields`
- Fields on **last 3 columns only** (TLL, TLR, GDL): from `aCommands` + the 5 extra entity props

### Fields → First 8 Columns (from additionalFields)

| # | Field Name | Type | Options (Value / Label / Abbr) | Default | Grid Cols |
|---|-----------|------|-------------------------------|---------|-----------|
| 1 | Critical Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | L1–R4 (8) |
| 2 | Tmp Warning Fail | `single` | `internal` / Internal / Int, `external` / External / EXT | Internal | L1–R4 (8) |
| 3 | Tmp Fatal Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | L1–R4 (8) |
| 4 | TGG Critical Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | L1–R4 (8) |
| 5 | Master Fail | `single` | `on` / On / —, `off` / Off / — | On | L1–R4 (8) |
| 6 | MSLs Fail | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | L1–R4 (8) |
| 7 | Temp Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | L1–R4 (8) |

### Fields → Last 3 Columns Only (from aCommands / extra props)

Fields 8–11 populate TLL + TLR (2 columns). Fields 12–14 populate GDL only (1 column).

| # | Field Name | Type | Options (Value / Label / Abbr) | Default | Grid Cols |
|---|-----------|------|-------------------------------|---------|-----------|
| 8 | Comm Fail | `single` | `no` / No / NO, `yes` / Yes / YES | No | TLL, TLR (2) |
| 9 | TRU Fail | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | TLL, TLR (2) |
| 10 | TRU Temp Fail | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | TLL, TLR (2) |
| 11 | Ant Select Cmd | `single` | `auto` / Auto / ATU, `manual` / Manual / MNL | Auto | TLL, TLR (2) |
| 12 | Ant Transmit Pwr | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |
| 13 | Super Transmit Pwr | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |
| 14 | Tmp Ant Select | `single` | `normal` / Normal / NRML, `forced` / FORCED / FRC | Normal | GDL (1) |

---

## Grid Column Definitions

### Board 1 — 8 Columns

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

### Board 2 — 11 Columns

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
| 8 | `tll` | TLL | — | Fields 8–11 populate this column |
| 9 | `tlr` | TLR | — | Fields 8–11 populate this column |
| 10 | `gdl` | GDL | — | Fields 12–14 populate this column |

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
