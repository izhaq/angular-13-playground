# Naming Swap Guide

**Feature**: 1-config-dashboard
**Date**: 2026-04-16

---

## Overview

The dashboard uses a driving-simulation naming convention (TTM, Captive, ABS Critical Fail, etc.) that is domain-specific. When copying the dashboard to a different project, all names — UI labels, code identifiers, file/folder names, CSS classes, API paths, abbreviations — can be swapped in a single automated pass using the rename system.

## Files

| File | Purpose |
|------|---------|
| `tools/naming-map.json` | JSON mapping template: `current name → ___` (fill in targets) |
| `tools/naming-map.flight.json` | Pre-built map: driving-sim → flight systems |
| `tools/naming-map.food.json` | Pre-built map: driving-sim → food production |
| `tools/rename.sh` | Bash script (macOS / Linux) |
| `tools/rename.js` | Node.js script (Windows / macOS / Linux — cross-platform) |

Both scripts have identical behavior. Use `--map` to point to any mapping file.

---

## Prerequisites

- **Node.js** (any version compatible with the project — v14+ or v16+)
- The script must be run from the **project root** directory (or from anywhere — it resolves paths relative to itself)
- `npm install` must have been run (for the verify phase)

---

## How to Run

### Step 1: Fill in `naming-map.json`

Open `tools/naming-map.json` in any editor. Each entry has the current name as the key and `"___"` as the placeholder target:

```json
{
  "propertyNames": {
    "ttm": "___",          // <-- replace "___" with your target name
    "videoRec": "myField"  // <-- example: renamed to "myField"
  }
}
```

Entries left as `"___"` are **skipped** — you can do partial renames (e.g., only rename labels, leave code identifiers untouched).

### Step 2: Preview (recommended)

Always preview first to see what will change:

```bash
# macOS / Linux
./tools/rename.sh --dry-run

# Windows (or any platform)
node tools/rename.js --dry-run
```

Output shows each replacement with its category:

```
Found 3 replacement(s) to apply.

=== DRY RUN — replacements that would be applied ===
  [typeNames] 'DashboardState' -> 'ControllerState'
  [labels] 'CMD' -> 'CTL'
  [propertyNames] 'ttm' -> 'throttleMode'

=== DRY RUN — no changes made ===
```

### Step 3: Apply

```bash
# With build + test verification (recommended)
node tools/rename.js
./tools/rename.sh

# Without verification (faster, use when iterating)
node tools/rename.js --skip-verify
./tools/rename.sh --skip-verify
```

### Flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview all replacements without modifying any files |
| `--skip-verify` | Skip the `npm run build` and `npx ng test` verification step |
| `--scope <dir>` | Limit scan to a specific folder and its recursive children (default: `src/` + `server/`) |
| `--map <file>` | Path to a naming-map JSON file (default: `tools/naming-map.json` next to the script) |
| `--help` | Print usage information |

---

## Quick Test (Ready-Made Maps)

Two pre-built domain maps are included for testing:

**Flight systems** (`tools/naming-map.flight.json`):

```bash
# Preview
node tools/rename.js --map tools/naming-map.flight.json --scope src --dry-run

# Apply
node tools/rename.js --map tools/naming-map.flight.json --scope src --skip-verify

# Revert
git checkout . && git clean -fd src/
```

**Food production** (`tools/naming-map.food.json`):

```bash
# Preview
node tools/rename.js --map tools/naming-map.food.json --scope src --dry-run

# Apply
node tools/rename.js --map tools/naming-map.food.json --scope src --skip-verify

# Revert
git checkout . && git clean -fd src/
```

Both maps swap all domain identifiers (labels, properties, types, components, folders, API paths, test IDs, constants) from the driving-simulation domain to their respective target domain.

---

## Scoping to a Specific Folder

By default the script scans `src/` and `server/`. Use `--scope` to target a single folder (and all its subdirectories) instead:

```bash
# Only rename inside the dashboard-wrapper component tree
node tools/rename.js --scope src/app/components/dashboard-wrapper --dry-run

# Only rename inside the server
./tools/rename.sh --scope server --dry-run

# Combine with other flags
node tools/rename.js --scope src/app/components/dashboard-wrapper --skip-verify
```

When `--scope` is active:
- **Content replacement** (Phase 1) only scans files inside that folder recursively
- **File/folder renaming** (Phase 2) only renames inside that folder recursively
- `proxy.conf.json` is **not** included (it lives outside any scoped folder)
- The path can be relative (to your current working directory) or absolute

This is useful when you want to rename identifiers in an isolated module without touching the rest of the project.

---

## What Folders Does It Scan? (Default — No `--scope`)

Without `--scope`, the script operates on these directories **recursively** (all subdirectories included):

| Directory | What it contains | Scanned? |
|-----------|-----------------|----------|
| `src/` | Angular app — components, services, models, styles, templates | Yes (all subdirectories) |
| `server/` | Node.js backend — Express, WebSocket, simulation engine | Yes (all subdirectories) |
| `proxy.conf.json` | Dev proxy config (contains API paths) | Yes (single file) |
| `node_modules/` | Dependencies | **No** (excluded) |
| `dist/` | Build output | **No** (excluded) |
| `.git/` | Git history | **No** (excluded) |
| `specs/` | Documentation | **No** (not in scan scope) |
| `tools/` | The scripts themselves | **No** (not in scan scope) |

**File types** scanned: `.ts`, `.html`, `.scss`, `.json`, `.md`

For file/folder renaming (Phase 2), only the scoped directories (or `src/` + `server/` by default) are searched.

---

## Using a Custom / Alternative Mapping File

By default, both scripts read `tools/naming-map.json` (located next to the script). The script and the map **do not** need to live in the same folder — use `--map` to point to any location.

### Using `--map` (recommended)

```bash
# Map file can live anywhere
node tools/rename.js --map /path/to/my-naming-map.json --dry-run
./tools/rename.sh --map ~/projects/other-app/naming-map.json --dry-run

# Combine with --scope
node tools/rename.js --map configs/medical-map.json --scope src/app/components/dashboard-wrapper
```

### Maintaining multiple mapping files

Keep multiple mapping files wherever you like and pass the one you need:

```
configs/
├── naming-map.medical.json
├── naming-map.industrial.json
└── naming-map.retail.json
```

```bash
node tools/rename.js --map configs/naming-map.medical.json --dry-run
```

Or keep them in `tools/` if you prefer co-location:

```
tools/
├── naming-map.json              # default (used when no --map is given)
├── naming-map.medical.json
├── rename.js
└── rename.sh
```

### Custom map file requirements

Any alternative mapping file must follow the **exact same JSON structure** as the original `naming-map.json`:

- Must have a `"meta"` section (can be empty: `"meta": {}`)
- Categories must use the same keys: `labels`, `operationLabels`, `rareOperationLabels`, `optionLabels`, `optionValues`, `abbreviations`, `scenarioLabels`, `scenarioValues`, `propertyNames`, `typeNames`, `componentNames`, `folderNames`, `apiPaths`, `testIds`, `constants`
- Each entry is `"currentName": "targetName"` — use `"___"` to skip
- You can omit entire categories (they'll be silently skipped)
- You can add new entries to existing categories if new identifiers have been introduced

---

## Full Example — Medical Device Domain

Suppose you're copying the dashboard to a medical-device monitoring project. Here's a filled-in `naming-map.json` (abbreviated — showing a few entries per category):

```json
{
  "meta": {
    "description": "Driving-simulation → Medical-device naming swap",
    "version": "1.0"
  },

  "labels": {
    "Scenario": "Protocol",
    "CMD": "Probe",
    "CMD to test": "Probe to test",
    "Frequent CMDs": "Common Probes",
    "Rare CMDs": "Rare Probes",
    "Default": "___",
    "Cancel": "___",
    "Save": "___"
  },

  "operationLabels": {
    "TTM": "Heart Rate",
    "Weather": "Blood Pressure",
    "Video rec": "ECG Record",
    "Video Type": "ECG Mode",
    "Headlights": "LED Indicator",
    "PWR On/Off": "PWR On/Off",
    "Force": "Stimulus",
    "Stability": "Baseline",
    "Cruise Ctrl": "Auto Dose",
    "PLR": "SPO2",
    "AUX": "AUX",
    "Nta": "Temp",
    "Tis Mtr Rec": "Flow Mtr Rec",
    "Ride Mtr Rec": "Pulse Mtr Rec"
  },

  "rareOperationLabels": {
    "ABS Critical Fail": "Sensor Critical Fail",
    "ABS Warning Fail": "Sensor Warning Fail",
    "ABS Fatal Fail": "Sensor Fatal Fail",
    "Brake Critical Fail": "Pump Critical Fail",
    "Master Reset Fail": "Master Reset Fail",
    "Flash Critical Fail": "Flash Critical Fail",
    "Bus Temp Fail": "Bus Temp Fail",
    "Tire Comm Fail": "Probe Comm Fail",
    "Fuel Map Temp Fail": "Reagent Temp Fail",
    "Coolant Critical Fail": "Coolant Critical Fail"
  },

  "optionLabels": {
    "Not Active": "Off",
    "Real": "Live",
    "Captive": "Simulated",
    "Internal": "Internal",
    "External": "External",
    "Normal": "Normal",
    "Force F": "Force F",
    "Force No": "Force No",
    "Ignore": "Ignore",
    "Left": "Channel A",
    "Right": "Channel B"
  },

  "optionValues": {
    "not-active": "off",
    "real": "live",
    "captive": "simulated",
    "internal": "___",
    "external": "___",
    "force-f": "___",
    "force-no": "___"
  },

  "abbreviations": {
    "N/A": "OFF",
    "REA": "LIV",
    "CAP": "SIM",
    "INT": "___",
    "EXT": "___",
    "NRM": "___",
    "FRC": "___",
    "FNO": "___",
    "IGN": "___"
  },

  "scenarioLabels": {
    "Highway Cruise": "Resting Protocol",
    "City Traffic": "Stress Test",
    "Off-Road Trail": "Recovery Phase",
    "Realtime": "Realtime"
  },

  "scenarioValues": {
    "highway-cruise": "resting-protocol",
    "city-traffic": "stress-test",
    "off-road-trail": "recovery-phase",
    "realtime": "___"
  },

  "propertyNames": {
    "ttm": "heartRate",
    "weather": "bloodPressure",
    "videoRec": "ecgRecord",
    "videoType": "ecgMode",
    "headlights": "ledIndicator",
    "pwrOnOff": "___",
    "force": "stimulus",
    "stability": "baseline",
    "cruiseCtrl": "autoDose",
    "plr": "spo2",
    "aux": "___",
    "nta": "temp",
    "tisMtrRec": "flowMtrRec",
    "rideMtrRec": "pulseMtrRec",
    "absCriticalFail": "sensorCriticalFail",
    "absWarningFail": "sensorWarningFail",
    "absFatalFail": "sensorFatalFail",
    "brakeCriticalFail": "pumpCriticalFail",
    "masterResetFail": "___",
    "flashCriticalFail": "___",
    "busTempFail": "___",
    "tireCommFail": "probeCommFail",
    "fuelMapTempFail": "reagentTempFail",
    "coolantCriticalFail": "___",
    "scenario": "protocol",
    "sides": "channels",
    "wheels": "sensors",
    "operations": "probes",
    "rareOperations": "rareProbes",
    "cmdTest": "probeTest"
  },

  "typeNames": {
    "FrequentOperationsModel": "CommonProbesModel",
    "FrequentOperationsKey": "CommonProbesKey",
    "FrequentOperationsFieldConfig": "CommonProbesFieldConfig",
    "RareOperationsModel": "RareProbesModel",
    "RareOperationsKey": "RareProbesKey",
    "RareOperationsFieldConfig": "RareProbesFieldConfig",
    "CmdTestModel": "ProbeTestModel",
    "CmdTestKey": "ProbeTestKey",
    "CmdTestFieldConfig": "ProbeTestFieldConfig",
    "CmdSelection": "ProbeSelection",
    "DashboardState": "MonitorState",
    "RareDashboardState": "RareMonitorState",
    "LeftPanelPayload": "___",
    "RareLeftPanelPayload": "___"
  },

  "componentNames": {
    "DashboardWrapper": "MonitorWrapper",
    "FrequentCmdsTab": "CommonProbesTab",
    "RareCmdsTab": "RareProbesTab",
    "CmdPanel": "ProbePanel",
    "StatusGrid": "___",
    "LeftPanel": "___",
    "RareLeftPanel": "___",
    "FrequentOperationsList": "CommonProbesList",
    "RareOperationsList": "RareProbesList",
    "CmdTestPanel": "ProbeTestPanel",
    "PanelFooter": "___",
    "TopBar": "___"
  },

  "folderNames": {
    "dashboard-wrapper": "monitor-wrapper",
    "frequent-cmds-tab": "common-probes-tab",
    "rare-cmds-tab": "rare-probes-tab",
    "cmd-panel": "probe-panel",
    "status-grid": "___",
    "left-panel": "___",
    "rare-left-panel": "___",
    "frequent-operations-list": "common-probes-list",
    "rare-operations-list": "rare-probes-list",
    "cmd-test-panel": "probe-test-panel",
    "panel-footer": "___",
    "top-bar": "___"
  },

  "apiPaths": {
    "/api/config": "/api/monitor-config",
    "/api/rare-config": "/api/rare-monitor-config",
    "/api/ws": "/api/monitor-ws",
    "/api/health": "___"
  },

  "testIds": {
    "topbar-scenario": "topbar-protocol",
    "cmd-sides": "probe-channels",
    "cmd-wheels": "probe-sensors",
    "frequent": "common",
    "rare": "___"
  },

  "constants": {
    "OPERATIONS_FIELDS": "PROBES_FIELDS",
    "OPERATIONS_KEYS": "PROBES_KEYS",
    "DEFAULT_OPERATIONS": "DEFAULT_PROBES",
    "RARE_OPERATIONS_FIELDS": "RARE_PROBES_FIELDS",
    "RARE_OPERATIONS_KEYS": "RARE_PROBES_KEYS",
    "DEFAULT_RARE_OPERATIONS": "DEFAULT_RARE_PROBES",
    "CMD_TEST_FIELDS": "PROBE_TEST_FIELDS",
    "CMD_TEST_KEYS": "PROBE_TEST_KEYS",
    "DEFAULT_CMD_TEST": "DEFAULT_PROBE_TEST",
    "GRID_COLUMNS": "___",
    "SCENARIOS": "PROTOCOLS",
    "FREQUENT_GRID_CONFIG": "COMMON_GRID_CONFIG",
    "RARE_GRID_CONFIG": "___",
    "DEFAULT_DASHBOARD_STATE": "DEFAULT_MONITOR_STATE",
    "DEFAULT_RARE_DASHBOARD_STATE": "DEFAULT_RARE_MONITOR_STATE"
  }
}
```

### Running it

```bash
# 1. Save the above as tools/naming-map.json (or use --map)

# 2. Preview all changes
node tools/rename.js --dry-run

# 3. Preview scoped to the dashboard only
node tools/rename.js --scope src/app/components/dashboard-wrapper --dry-run

# 4. Apply to the full project with verification
node tools/rename.js

# 5. Or apply using a map file stored elsewhere, scoped to one folder
node tools/rename.js --map configs/medical-map.json --scope src/app/components/dashboard-wrapper --skip-verify
```

### Expected dry-run output (excerpt)

```
Found 87 replacement(s) to apply.

Scope: /Users/me/project/src/app/components/dashboard-wrapper (recursive)

=== DRY RUN — replacements that would be applied ===
  [typeNames] 'FrequentOperationsFieldConfig' -> 'CommonProbesFieldConfig'
  [typeNames] 'FrequentOperationsModel' -> 'CommonProbesModel'
  [typeNames] 'FrequentOperationsKey' -> 'CommonProbesKey'
  [typeNames] 'RareOperationsFieldConfig' -> 'RareProbesFieldConfig'
  [constants] 'DEFAULT_RARE_DASHBOARD_STATE' -> 'DEFAULT_RARE_MONITOR_STATE'
  [constants] 'DEFAULT_DASHBOARD_STATE' -> 'DEFAULT_MONITOR_STATE'
  [componentNames] 'FrequentOperationsList' -> 'CommonProbesList'
  [folderNames] 'frequent-operations-list' -> 'common-probes-list'
  [propertyNames] 'sensorCriticalFail' -> 'sensorCriticalFail'
  [labels] 'Frequent CMDs' -> 'Common Probes'
  [labels] 'CMD' -> 'Probe'
  ...

=== DRY RUN — no changes made ===
```

### What changes in code (before → after)

**Interface** (`dashboard-state.model.ts` → `monitor-state.model.ts`):

```typescript
// BEFORE
export interface DashboardState {
  operations: FrequentOperationsModel;
  cmdTest: CmdTestModel;
  scenario: string;
}

// AFTER
export interface MonitorState {
  probes: CommonProbesModel;
  probeTest: ProbeTestModel;
  protocol: string;
}
```

**Template** (`left-panel.component.html`):

```html
<!-- BEFORE -->
<app-dropdown [testId]="'cmd-sides'" [label]="'CMD'" ...>

<!-- AFTER -->
<app-dropdown [testId]="'probe-channels'" [label]="'Probe'" ...>
```

**Folder structure**:

```
# BEFORE
src/app/components/dashboard-wrapper/
  components/frequent-cmds-tab/
    components/frequent-operations-list/
    components/cmd-test-panel/

# AFTER
src/app/components/monitor-wrapper/
  components/common-probes-tab/
    components/common-probes-list/
    components/probe-test-panel/
```

---

## What the Script Does (3 Phases)

**Phase 1 — Content replacement**: Scans all matching files in `src/` and `server/` recursively. For each mapping entry, replaces all occurrences of the current name with the target name. Replacements are applied **longest-first** to prevent partial matches.

**Phase 2 — File/folder renaming**: Renames files and folders based on the `folderNames` category. Works **deepest-first** (bottom-up) so child paths are renamed before parents. This covers both directory names and file name stems (e.g., `cmd-panel.component.ts` → `control-panel.component.ts`).

**Phase 3 — Verification**: Runs `npm run build` and `npx ng test --watch=false --browsers=ChromeHeadless` to ensure the rename didn't break anything. Use `--skip-verify` to skip this step.

---

## Categories in naming-map.json

| Category | What it covers | Example |
|----------|---------------|---------|
| `labels` | Section headings, button text, tab labels | `"CMD"`, `"Save"`, `"Frequent CMDs"` |
| `operationLabels` | Dropdown labels for Tab 1 operations | `"TTM"`, `"Weather"`, `"Video rec"` |
| `rareOperationLabels` | Dropdown labels for Tab 2 operations | `"ABS Critical Fail"`, `"Bus Temp Fail"` |
| `optionLabels` | Dropdown option display text | `"Captive"`, `"Internal"`, `"Normal"` |
| `optionValues` | Dropdown option value keys | `"captive"`, `"internal"`, `"force-f"` |
| `abbreviations` | 3-letter grid cell abbreviations | `"CAP"`, `"INT"`, `"NRM"` |
| `scenarioLabels` | Scenario dropdown display text | `"Highway Cruise"`, `"Realtime"` |
| `scenarioValues` | Scenario value keys | `"highway-cruise"`, `"realtime"` |
| `propertyNames` | Interface property names, object keys | `"ttm"`, `"videoRec"`, `"absCriticalFail"` |
| `typeNames` | Interface/type/class names | `"DashboardState"`, `"FrequentOperationsModel"` |
| `componentNames` | Angular component class name stems | `"DashboardWrapper"`, `"CmdPanel"` |
| `folderNames` | Directory and file name stems | `"dashboard-wrapper"`, `"cmd-panel"` |
| `apiPaths` | REST and WebSocket endpoint paths | `"/api/config"`, `"/api/ws"` |
| `testIds` | `data-test-id` attribute values | `"topbar-scenario"`, `"cmd-sides"` |
| `constants` | Exported constant names | `"OPERATIONS_FIELDS"`, `"DEFAULT_DASHBOARD_STATE"` |

---

## Replacement Order

Replacements are sorted **longest string first**. This prevents a shorter name from matching inside a longer one:

- `FrequentOperationsFieldConfig` is replaced before `FrequentOperationsField`
- `DashboardState` is replaced before `Dashboard`
- `force-no` is replaced before `force`

Content replacement happens **before** file/folder renaming, so all import paths and references are updated while files still have their original names.

---

## Git Workflow

Recommended workflow for applying a naming swap:

```bash
# 1. Create a branch
git checkout -b my-naming-swap

# 2. Edit the mapping
vi tools/naming-map.json       # or open in any editor

# 3. Preview changes
node tools/rename.js --dry-run   # cross-platform
# or: ./tools/rename.sh --dry-run   # macOS/Linux only

# 4. Apply (with build+test verification)
node tools/rename.js
# or: ./tools/rename.sh

# 5. Review and commit
git diff
git add -A
git commit -m "Applied naming swap for [project-name]"
```

For CI pipelines:

```bash
node tools/rename.js --skip-verify
npm run build
npx ng test --watch=false --browsers=ChromeHeadless
```

---

## Troubleshooting

### Build fails after rename

**Common cause**: A replacement created an unintended match. For example, renaming `"force"` to `"power"` might also change `"force-f"` to `"power-f"` if `"force-f"` wasn't mapped separately.

**Fix**: Check the `optionValues` and `propertyNames` categories — make sure compound names that contain shorter names are also mapped explicitly. The longest-first ordering handles most cases, but overlapping names in different categories can still collide.

### Partial rename

You can safely leave entries as `"___"` — the script skips them. This lets you rename only the categories you care about (e.g., just UI labels, or just property names).

### Re-running after a partial rename

The script uses the **current** file contents, not the original. If you've already renamed some entries, update `naming-map.json` to reflect the current names as keys before running again.

### Import paths break

Import paths contain folder names (e.g., `'../dashboard-wrapper/...'`). The content replacement in Phase 1 handles these because folder name strings appear in import statements. Phase 2 then renames the actual files/folders to match.

If you rename folders but not the matching content, imports will break. Always ensure `folderNames` entries match corresponding `componentNames` entries.

---

## What Not to Rename

Some identifiers are structural/framework-level and should generally stay as-is:

- `GridConfig`, `GridRowDef`, `GridColumnDef`, `CellValue`, `RowViewModel`, `FieldUpdate` — generic grid infrastructure
- `TabStateService`, `TabStateConfig`, `TAB_STATE_CONFIG` — generic state management
- `WsService`, `WsConnection` — generic WebSocket infrastructure
- `StatusGridService` — generic grid data service
- `AppDropdownComponent`, `AppMultiDropdownComponent` — generic UI components
- `TestIdDirective` — generic testing directive
- `DropdownOption`, `DropdownHost` — generic dropdown models

These are domain-agnostic utilities that work for any naming convention.
