# Migration Guide: Copying `app-dashboard-wrapper` to Another Project

**Feature**: 1-config-dashboard
**Date**: 2026-04-16

---

## Overview

This document lists every file, dependency, and configuration needed to copy the `app-dashboard-wrapper` component into another Angular 13.3.x project with Angular Material 13.x.

---

## Prerequisites

The target project must have:

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@angular/core` | `~13.3.0` | Framework |
| `@angular/common` | `~13.3.0` | CommonModule |
| `@angular/material` | `~13.3.0` | MatSelectModule, MatTabsModule |
| `@angular/cdk` | `~13.3.0` | CDK (required by Material) |
| `@angular/forms` | `~13.3.0` | FormsModule (used by dropdown CVA) |
| `rxjs` | `~7.x` | Observables |

The target project must also support SCSS as a style preprocessor.

---

## Files to Copy

### 1. Dashboard Wrapper (main component)

```
src/app/components/dashboard-wrapper/
├── dashboard-wrapper.component.ts
├── dashboard-wrapper.component.html
├── dashboard-wrapper.component.scss
├── dashboard-wrapper.component.spec.ts
├── dashboard-wrapper.module.ts
│
├── models/
│   └── scenario.constants.ts
│
├── services/
│   ├── tab-state.config.ts          # TabStateConfig<T>, TAB_STATE_CONFIG InjectionToken
│   ├── tab-state.service.ts         # Generic TabStateService<T>
│   ├── tab-state.service.spec.ts
│   ├── ws-connection.ts             # Raw WebSocket connection + reconnect
│   ├── ws.service.ts                # WsService (parses FieldUpdate messages)
│   └── ws.service.spec.ts
│
├── components/
│   ├── top-bar/
│   │   ├── top-bar.component.ts
│   │   ├── top-bar.component.html
│   │   ├── top-bar.component.scss
│   │   ├── top-bar.component.spec.ts
│   │   └── top-bar.module.ts
│   │
│   ├── cmd-panel/
│   │   ├── cmd-panel.component.ts
│   │   ├── cmd-panel.component.html
│   │   ├── cmd-panel.component.scss
│   │   ├── cmd-panel.component.spec.ts
│   │   ├── cmd-panel.models.ts       # CmdSelection, SIDE_OPTIONS, WHEEL_OPTIONS
│   │   └── cmd-panel.module.ts
│   │
│   ├── panel-footer/
│   │   ├── panel-footer.component.ts
│   │   ├── panel-footer.component.html
│   │   ├── panel-footer.component.scss
│   │   ├── panel-footer.component.spec.ts
│   │   └── panel-footer.module.ts
│   │
│   ├── status-grid/
│   │   ├── status-grid.component.ts
│   │   ├── status-grid.component.html
│   │   ├── status-grid.component.scss
│   │   ├── status-grid.component.spec.ts
│   │   ├── status-grid.module.ts
│   │   ├── models/
│   │   │   ├── grid.models.ts        # GridConfig, GridRowDef, GridColumnDef, CellValue, RowViewModel, FieldUpdate
│   │   │   ├── grid-columns.ts       # GRID_COLUMNS (L1–R4)
│   │   │   └── grid-defaults.ts      # buildGridRowDefs(), buildRareGridRowDefs(), buildInitialGridRows()
│   │   └── services/
│   │       ├── status-grid.service.ts
│   │       └── status-grid.service.spec.ts
│   │
│   ├── frequent-cmds-tab/
│   │   ├── frequent-cmds-tab.component.ts
│   │   ├── frequent-cmds-tab.component.html
│   │   ├── frequent-cmds-tab.component.scss
│   │   ├── frequent-cmds-tab.component.spec.ts
│   │   ├── frequent-cmds-tab.module.ts
│   │   ├── models/
│   │   │   ├── dashboard.models.ts            # DashboardState, LeftPanelPayload
│   │   │   ├── dashboard-defaults.ts          # DEFAULT_DASHBOARD_STATE
│   │   │   ├── dashboard-view.model.ts
│   │   │   └── frequent-grid-config.ts        # FREQUENT_GRID_CONFIG
│   │   └── components/
│   │       ├── left-panel/
│   │       │   ├── left-panel.component.ts
│   │       │   ├── left-panel.component.html
│   │       │   ├── left-panel.component.scss
│   │       │   ├── left-panel.component.spec.ts
│   │       │   └── left-panel.module.ts
│   │       ├── frequent-operations-list/
│   │       │   ├── frequent-operations-list.component.ts
│   │       │   ├── frequent-operations-list.component.html
│   │       │   ├── frequent-operations-list.component.scss
│   │       │   ├── frequent-operations-list.component.spec.ts
│   │       │   ├── frequent-operations-list.models.ts  # FrequentOperationsModel, OPERATIONS_FIELDS
│   │       │   └── frequent-operations-list.module.ts
│   │       └── cmd-test-panel/
│   │           ├── cmd-test-panel.component.ts
│   │           ├── cmd-test-panel.component.html
│   │           ├── cmd-test-panel.component.scss
│   │           ├── cmd-test-panel.component.spec.ts
│   │           ├── cmd-test-panel.models.ts            # CmdTestModel, CMD_TEST_FIELDS
│   │           └── cmd-test-panel.module.ts
│   │
│   └── rare-cmds-tab/
│       ├── rare-cmds-tab.component.ts
│       ├── rare-cmds-tab.component.html
│       ├── rare-cmds-tab.component.scss
│       ├── rare-cmds-tab.component.spec.ts
│       ├── rare-cmds-tab.module.ts
│       ├── models/
│       │   ├── rare-dashboard.models.ts       # RareDashboardState, RareLeftPanelPayload
│       │   ├── rare-dashboard-defaults.ts     # DEFAULT_RARE_DASHBOARD_STATE
│       │   └── rare-grid-config.ts            # RARE_GRID_CONFIG (with TTL, TTR, SSL columns)
│       └── components/
│           ├── rare-left-panel/
│           │   ├── rare-left-panel.component.ts
│           │   ├── rare-left-panel.component.html
│           │   ├── rare-left-panel.component.scss
│           │   ├── rare-left-panel.component.spec.ts
│           │   └── rare-left-panel.module.ts
│           └── rare-operations-list/
│               ├── rare-operations-list.component.ts
│               ├── rare-operations-list.component.html
│               ├── rare-operations-list.component.scss
│               ├── rare-operations-list.component.spec.ts
│               ├── rare-operations-list.models.ts      # RareOperationsModel, RARE_OPERATIONS_FIELDS
│               └── rare-operations-list.module.ts
```

**Total**: ~80 files

### 2. Shared UI Components (dependencies)

These are external to `dashboard-wrapper/` but required by it:

```
src/app/components/app-dropdown/
├── app-dropdown.component.ts
├── app-dropdown.component.html
├── app-dropdown.component.scss
├── app-dropdown.component.spec.ts
├── app-dropdown.models.ts           # DropdownOption, DropdownHost, DROPDOWN_HOST
└── app-dropdown.module.ts

src/app/components/app-multi-dropdown/
├── app-multi-dropdown.component.ts
├── app-multi-dropdown.component.html
├── app-multi-dropdown.component.scss
├── app-multi-dropdown.component.spec.ts
└── app-multi-dropdown.module.ts

src/app/components/app-dropdown-cva/
├── app-dropdown-cva.directive.ts    # ControlValueAccessor bridge
├── app-dropdown-cva.directive.spec.ts
└── app-dropdown-cva.module.ts
```

### 3. Shared Directives

```
src/app/shared/directives/
├── test-id.directive.ts             # appTestId directive → data-test-id attribute
└── test-id.module.ts
```

### 4. Global SCSS Partials

```
src/styles/
├── _variables.scss     # Design tokens: colors, spacing, typography, border-radius
├── _dropdowns.scss     # Global dropdown styling (Material overrides, sizing)
└── _tabs.scss          # Global mat-tab styling (Material overrides, compact sizing)
```

These must be importable via `@import 'variables'` etc. Ensure the SCSS `includePaths` in `angular.json` includes `src/styles/`:

```json
{
  "stylePreprocessorOptions": {
    "includePaths": ["src/styles"]
  }
}
```

### 5. Backend (Node.js Server)

If the target project needs the mock backend:

```
server/
├── tsconfig.json
└── src/
    ├── index.ts                    # Express + WebSocket server
    ├── models.ts                   # Server-side type definitions
    └── simulation-engine.ts        # processConfig(), processRareConfig(), resolveAbbr()
```

### 6. Proxy Configuration

```
proxy.conf.json                     # Proxies /api/* (including WebSocket at /api/ws) to Node server
```

---

## Configuration Steps

### Step 1: Copy Files

Copy all directories listed above into the target project, preserving relative paths.

### Step 2: Install Material Dependencies

If not already present:

```bash
npm install @angular/material@~13.3.0 @angular/cdk@~13.3.0
```

### Step 3: Configure SCSS Include Paths

In `angular.json` under `projects.{name}.architect.build.options`:

```json
"stylePreprocessorOptions": {
  "includePaths": ["src/styles"]
}
```

### Step 4: Import the Module

In your host module:

```typescript
import { DashboardWrapperModule } from './components/dashboard-wrapper/dashboard-wrapper.module';

@NgModule({
  imports: [DashboardWrapperModule],
})
export class HostModule {}
```

### Step 5: Add to Template

```html
<app-dashboard-wrapper></app-dashboard-wrapper>
```

The component renders as a fixed-position element (1120px × 500px, bottom-left corner).

### Step 6: Set Up Backend (optional)

If using the mock backend:

1. Copy `server/` directory
2. Copy `proxy.conf.json`
3. Add npm scripts to `package.json`:

```json
{
  "scripts": {
    "server:start": "ts-node-dev --project server/tsconfig.json server/src/index.ts",
    "server:build": "tsc --project server/tsconfig.json",
    "server:prod": "node server/dist/index.js"
  }
}
```

4. Install server dependencies:

```bash
npm install express ws cors
npm install --save-dev @types/express @types/ws @types/cors ts-node-dev
```

5. Reference `proxy.conf.json` in `angular.json` serve config:

```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

### Step 7: Adapt API URLs (if different backend)

If connecting to a real backend instead of the mock server, update the `TabStateConfig` providers in each tab module:

- `frequent-cmds-tab.module.ts` — change `apiUrl` from `'/api/config'`
- `rare-cmds-tab.module.ts` — change `apiUrl` from `'/api/rare-config'`

The WebSocket URL is determined dynamically from `window.location` in `ws-connection.ts` (path: `/api/ws`). Adjust if your backend uses a different WebSocket endpoint.

---

## Import Dependency Graph

```
DashboardWrapperModule
├── TopBarModule
│   └── AppDropdownModule
├── FrequentCmdsTabModule
│   ├── CmdPanelModule
│   │   └── AppMultiDropdownModule
│   ├── LeftPanelModule
│   │   ├── FrequentOperationsListModule
│   │   │   ├── AppDropdownModule
│   │   │   └── AppMultiDropdownModule
│   │   ├── CmdTestPanelModule
│   │   │   └── AppDropdownModule
│   │   └── PanelFooterModule
│   ├── StatusGridModule
│   │   └── TestIdDirectiveModule
│   ├── TabStateService<DashboardState> (provided via TAB_STATE_CONFIG)
│   └── WsService (provided at this level or wrapper)
├── RareCmdsTabModule
│   ├── CmdPanelModule
│   ├── RareLeftPanelModule
│   │   ├── RareOperationsListModule
│   │   │   └── AppDropdownModule
│   │   └── PanelFooterModule
│   ├── StatusGridModule
│   ├── TabStateService<RareDashboardState> (provided via TAB_STATE_CONFIG)
│   └── WsService
├── MatTabsModule
└── TestIdDirectiveModule
```

---

## Checklist

- [ ] All `dashboard-wrapper/` files copied
- [ ] `app-dropdown/`, `app-multi-dropdown/`, `app-dropdown-cva/` copied
- [ ] `shared/directives/test-id.*` copied
- [ ] `src/styles/_variables.scss`, `_dropdowns.scss`, `_tabs.scss` copied
- [ ] SCSS `includePaths` configured in `angular.json`
- [ ] Angular Material installed and a theme configured
- [ ] `DashboardWrapperModule` imported in host module
- [ ] `<app-dashboard-wrapper>` added to host template
- [ ] (Optional) Server files copied and npm scripts added
- [ ] (Optional) `proxy.conf.json` copied and referenced in serve config
- [ ] API URLs adjusted if using a different backend
