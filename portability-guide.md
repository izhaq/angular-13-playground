# Portability Guide — How to Export / Copy to Another Project

**Feature**: 1-config-dashboard
**Date**: 2026-04-02

---

This document covers everything needed to extract the Configuration Dashboard feature and integrate it into a different Angular project.

## Step 1: Copy Component Folders

Copy the following folders from `src/app/components/` into the target project's component directory.

**Copy `config-dashboard/` in full** — the portable feature lives under one root: `models/`, `services/`, and nested `components/` (`top-bar/`, `left-panel/`, `cmd-form-panel/`, `operations-form-list/`, `status-grid/`). You do not copy those five as separate siblings under `components/`; they ship inside `config-dashboard/components/`.

**Architecture**: `ConfigDashboardComponent` is a layout orchestrator. `LeftPanelComponent` (in `config-dashboard/components/left-panel/`) owns the reactive `FormGroup` for the command pair and operations list and exposes `formChanged`, `saved`, and `cancelled` outputs; `ConfigDashboardModule` imports `LeftPanelModule` (which in turn imports `CmdFormPanelModule` and `OperationsFormListModule`) rather than wiring those CVAs directly.

| Folder | What it contains | Self-contained? |
|--------|-----------------|-----------------|
| `config-dashboard/` | Layout orchestrator (`ConfigDashboardComponent`), shared models (`models/`), shared services (`services/`), and nested dashboard UI (`components/top-bar/`, `components/left-panel/`, `components/cmd-form-panel/`, `components/operations-form-list/`, `components/status-grid/`) | Yes — copy the entire tree; all dashboard pieces are included |
| `app-dropdown/` | Single-select dropdown wrapping `mat-select`. Contains `AppDropdownComponent` and shared models (`DropdownOption`, `DropdownHost`, `DROPDOWN_HOST` token). Purely presentational with `@Input`/`@Output`. | Yes — fully self-contained |
| `app-multi-dropdown/` | Multi-select dropdown wrapping `mat-select[multiple]`. Contains `AppMultiDropdownComponent`. Imports models from `app-dropdown/`. | Yes — depends on `app-dropdown/` models only |
| `app-dropdown-cva/` | Generic CVA bridge directive (`AppDropdownCvaDirective`). Activates only when a form directive is present. Works with any component providing `DROPDOWN_HOST`. | Yes — depends on `app-dropdown/` models only |

**Do NOT copy** `src/app/mocks/` — this is project-level mock data. The target project provides its own data.

## Step 2: Install npm Dependencies

The target project needs these packages (adjust versions to match its Angular version):

```
@angular/material   (this project uses ^13.3.9)
@angular/cdk        (this project uses ^13.3.9)
@angular/forms      (ReactiveFormsModule — required for form mode / CVA directive;
                     AppDropdown and AppMultiDropdown also work standalone with
                     [value]/(changed) without forms, but other CVA components
                     like CmdFormPanelComponent and OperationsFormListComponent require it)
```

## Step 3: Copy Styles Infrastructure

The components use SCSS variables from `src/styles/_variables.scss`. Copy this file to the target project:

```
src/styles/_variables.scss   →   <target>/src/styles/_variables.scss
src/styles/_dropdowns.scss   →   <target>/src/styles/_dropdowns.scss
```

**Tokens used by components** (directly or via `@import 'variables'`):

| Token | Value | Used by |
|-------|-------|---------|
| `$background` | `#0e0e0e` | Global body background |
| `$surface-container-low` | `#131313` | Card backgrounds |
| `$surface-container` | `#191a1a` | Form field backgrounds |
| `$surface-container-high` | `#1f2020` | Select panel backgrounds |
| `$surface-container-highest` | `#252626` | Hover states |
| `$primary-text` | `#e7e5e4` | Primary text color |
| `$secondary-text` | `#acabaa` | Labels, descriptions |
| `$primary` | `#c6c6c7` | Brand/accent |
| `$error` | `#ee7d77` | Error states, red indicator |
| `$tertiary` | `#eff8ff` | Accent, code highlights |
| `$font-family-headline` | `'Manrope', sans-serif` | Section headers |
| `$font-family-body` | `'Inter', sans-serif` | Body text, labels |
| `$spacing-xs` through `$spacing-xl` | `4px` – `32px` | Layout spacing |
| `$border-radius` | `4px` | Border radius |

> **Note**: Dropdown styling is centralized in `src/styles/_dropdowns.scss` (a global stylesheet using the `.app-dropdown-field` class). Both `app-dropdown` and `app-multi-dropdown` templates apply this class to their `mat-form-field`. No `::ng-deep` is used. Copy this file alongside `_variables.scss` and import it in the target project's global stylesheet.

## Step 4: Configure `angular.json`

Add `stylePreprocessorOptions` to both `build` and `test` targets so component SCSS files can `@import 'variables'` without relative path gymnastics:

```json
"stylePreprocessorOptions": {
  "includePaths": ["src/styles"]
}
```

This goes under `architect > build > options` and `architect > test > options`.

## Step 5: Add Global Angular Material Theme Overrides

Copy or adapt the Material theme overrides from `src/styles.scss` into the target project's global stylesheet. The critical overrides are:

```scss
@use '@angular/material' as mat;

// Custom dark theme — adapt palette to target project's design system
// See src/styles.scss for full palette and typography config

// Material component overrides for dark backgrounds
.mat-form-field-appearance-fill .mat-form-field-flex {
  background-color: $surface-container;
}

.mat-select-panel {
  background-color: $surface-container-high;
}

.mat-option {
  color: $primary-text;
}

.mat-option:hover:not(.mat-option-disabled) {
  background-color: $surface-container-highest;
}
```

If the target project uses a different theme, replace these with equivalent overrides for its design system.

## Step 6: Add Google Fonts

Add to `index.html` (or equivalent):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

If the target project already has its own fonts, update `$font-family-headline` and `$font-family-body` in `_variables.scss` instead.

## Step 7: Wire the Module

In the target project's parent module:

```typescript
import { ConfigDashboardModule } from './components/config-dashboard/config-dashboard.module';

@NgModule({
  imports: [
    // ...existing imports
    ConfigDashboardModule,
  ],
})
export class TargetModule { }
```

Then place `<app-config-dashboard></app-config-dashboard>` in the host template.

## Step 8: Provide Mock Data

The dashboard's `ConfigDashboardComponent` (layout orchestrator) and `LeftPanelComponent` (form owner for the left column) expect option lists and mock data to be passed in or configured. The source project uses `src/app/mocks/mock-data.ts` for this, but the dashboard itself does NOT import from `mocks/` — data flows through `DashboardFormService`, `StatusGridService`, and component `@Input`s.

Create equivalent mock data in the target project or wire it to real data sources.

## Checklist Summary

| # | Action | Required? |
|---|--------|-----------|
| 1 | Copy `config-dashboard/` (entire folder tree) plus `app-dropdown/`, `app-multi-dropdown/`, and `app-dropdown-cva/` | Yes |
| 2 | Install `@angular/material`, `@angular/cdk`, `@angular/forms` | Yes |
| 3 | Copy `src/styles/_variables.scss` and `_dropdowns.scss` | Yes |
| 4 | Add `stylePreprocessorOptions` to `angular.json` | Yes (if components import variables) |
| 5 | Add Material theme overrides to global styles | Yes (for correct dark theme rendering) |
| 6 | Add Google Fonts links | Yes (unless using different fonts) |
| 7 | Import `ConfigDashboardModule` in host module | Yes |
| 8 | Provide mock/real data | Yes |
