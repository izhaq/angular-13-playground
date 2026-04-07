# Quickstart: Configuration Dashboard

**Feature**: 1-config-dashboard
**Date**: 2026-04-02

---

## Prerequisites

- **Node.js**: v14.15+ or v16.10+ (`node -v` to check)
- **npm**: v6+ (`npm -v` to check)
- **Git**: repo cloned at `/Users/yizhaq.baroz/IdeaProjects/angular-13-playground`

## Initial Setup (Phase 0)

```bash
cd /Users/yizhaq.baroz/IdeaProjects/angular-13-playground

# 1. Switch to feature branch
git checkout 1-config-dashboard

# 2. Scaffold Angular 13 project (into current directory)
npx @angular/cli@13 new angular-13-playground \
  --directory=. \
  --style=scss \
  --routing=false \
  --skip-git=true \
  --skip-tests=false

# 3. Add Angular Material 13
npx ng add @angular/material@13 --defaults

# 4. Verify it works
npx ng serve --open
```

## Development Commands

```bash
# Serve locally (hot reload)
npx ng serve

# Run unit tests
npx ng test

# Run unit tests (CI mode, no watch)
npx ng test --watch=false --browsers=ChromeHeadless

# Build for production
npx ng build --configuration production

# Generate a new component (example)
npx ng generate component components/my-component --module=app
```

## Project Structure

```
src/
├── styles/
│   └── _variables.scss               # Stitch design tokens (colors, fonts, spacing)
├── styles.scss                       # Global Angular Material dark theme
├── app/
│   ├── mocks/                        # Project-level mock data
│   │   └── mock-data.ts
│   ├── components/
│   │   ├── app-dropdown/             # Generic CVA dropdown (+ DropdownOption model)
│   │   └── config-dashboard/         # Layout orchestrator (PORTABLE)
│   │       ├── models/               # Shared dashboard models
│   │       ├── services/             # DashboardFormService + StatusGridService
│   │       └── components/
│   │           ├── top-bar/          # Top navigation bar (dumb)
│   │           ├── cmd-form-panel/   # Command selection CVA (+ CommandPair model)
│   │           ├── operations-form-list/   # Operations config CVA
│   │           ├── left-panel/       # Left column: owns FormGroup, composes cmd + operations
│   │           └── status-grid/        # Status matrix (dumb)
│   ├── app.module.ts
│   └── app.component.ts
```

## Key Patterns

### ControlValueAccessor
Components that implement CVA: `AppDropdownComponent`, `CmdFormPanelComponent`, `OperationsFormListComponent`.
Use with `formControlName` on `LeftPanelComponent`'s `FormGroup` (not directly on `ConfigDashboardComponent`).

### Module-per-component
Each component has its own NgModule. `LeftPanelModule` composes the command and operations modules; `ConfigDashboardModule` imports `LeftPanelModule` instead of those two directly:

```typescript
@NgModule({
  imports: [
    CmdFormPanelModule,
    OperationsFormListModule,
    CommonModule,
    ReactiveFormsModule,
  ],
})
export class LeftPanelModule {}

@NgModule({
  imports: [
    LeftPanelModule,
    TopBarModule,
    StatusGridModule,
    ReactiveFormsModule,
  ],
})
export class ConfigDashboardModule {}
```

### Dumb vs Smart Components
- **Layout orchestrator**: `ConfigDashboardComponent` (composes `TopBar`, `LeftPanel`, `StatusGrid`; wires `DashboardStateService`; Save/Cancel/Reset)
- **Smart (left column)**: `LeftPanelComponent` (owns `FormGroup` for `commands` / `operations`; `@Output() formChanged`, `saved`, `cancelled`)
- **Dumb**: `TopBarComponent`, `StatusGridComponent` (Input/Output only)
- **Dumb + CVA**: `AppDropdownComponent`, `CmdFormPanelComponent`, `OperationsFormListComponent`

## Exporting to Another Project

See **[portability-guide.md](../../portability-guide.md)** for the full 8-step checklist covering the `config-dashboard/` folder tree (and generic dropdown folders), npm dependencies, SCSS variables, angular.json config, theme overrides, fonts, module wiring, and data provisioning.

## Related Docs

- [Feature Spec](./spec.md)
- [Implementation Plan](./impl-plan.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
- [Portability Guide](../../portability-guide.md)
