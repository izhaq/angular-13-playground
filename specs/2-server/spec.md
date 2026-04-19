# Server Spec: Configuration Dashboard Backend (Revised)

**Feature**: 2-server
**Date**: 2026-04-09 (original) | 2026-04-14 (revised for tabbed dashboard + rare CMDs) | 2026-04-16 (current)

---

## Overview

A lightweight Node.js/Express server that acts as the backend for the Configuration Dashboard. It provides:

1. A **REST API** to receive and persist configuration changes from both dashboard tabs (frequent and rare CMDs).
2. A **WebSocket server** to push real-time `FieldUpdate` messages back to the client's status grids after configuration is saved.
3. **Static file serving** for the production Angular build (`dist/`).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Angular Client                              │
│  ┌──────────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │TabStateService   │  │TabStateService│  │  WsService     │  │
│  │  <DashboardState> │  │<RareDash…>   │  │  (shared WS)   │  │
│  │  POST /api/config │  │ POST         │  │  → message$    │  │
│  └────────┬──────────┘  │/api/rare-    │  └──────┬─────────┘  │
│           │              │config        │         │ onmessage   │
│           │              └──────┬───────┘         │             │
└───────────│────────────────────│─────────────────│────────────┘
            │                    │                 │
            ┌────────────────────▼─────────────────▼──────────┐
            │          Node.js Server                          │
            │  ┌────────────────────────────────────────────┐  │
            │  │  Express (REST)                            │  │
            │  │  POST /api/config      (frequent CMDs)     │  │
            │  │  GET  /api/config                          │  │
            │  │  POST /api/rare-config (rare CMDs)         │  │
            │  │  GET  /api/rare-config                     │  │
            │  │  GET  /api/health                          │  │
            │  └──────────────┬─────────────────────────────┘  │
            │                 │                                │
            │  ┌──────────────▼─────────────────────────────┐  │
            │  │  Simulation Engine                          │  │
            │  │  processConfig(state) → FieldUpdate[]       │  │
            │  │  processRareConfig(state) → FieldUpdate[]   │  │
            │  └──────────────┬─────────────────────────────┘  │
            │                 │                                │
            │  ┌──────────────▼─────────────────────────────┐  │
            │  │  WebSocket Server (ws)                      │  │
            │  │  Path: /api/ws                              │  │
            │  │  Broadcasts FieldUpdate[] to all clients    │  │
            │  └────────────────────────────────────────────┘  │
            └──────────────────────────────────────────────────┘
```

## Data Flow

### Save Configuration (Frequent CMDs — Tab 1)

1. User clicks **Save** in the Frequent CMDs tab.
2. `TabStateService<DashboardState>.saveConfig()` sends `POST /api/config` with the `DashboardState` body (scenario, cmd selections, 11 operations + 3 cmd tests).
3. Server receives the payload, passes it to `processConfig()`.
4. `processConfig()` uses `cmd.sides × cmd.wheels` to determine which grid columns are affected, then generates a `FieldUpdate[]` — one per operation — with `CellValue` objects containing both raw value and abbreviation (resolved server-side via `resolveAbbr`).
5. Server broadcasts each `FieldUpdate` over WebSocket to all connected clients, staggered by `WS_UPDATE_DELAY_MS` (default 300ms).
6. Client's `StatusGridService` (Tab 1 instance) receives each message and calls `applyUpdate()` to merge `CellValue` objects into the grid.

### Save Configuration (Rare CMDs — Tab 2)

1. User clicks **Save** in the Rare CMDs tab.
2. `TabStateService<RareDashboardState>.saveConfig()` sends `POST /api/rare-config` with the `RareDashboardState` body (scenario, cmd selections, 10 rare operations).
3. Server receives the payload, passes it to `processRareConfig()`.
4. Same broadcast flow as above. Tab 2's `StatusGridService` instance picks up the relevant fields; Tab 1's instance ignores them (and vice versa).

### WebSocket Reconnection

`WsConnection` (used by `WsService`) implements auto-reconnect with a 3-second delay. `disconnect()` (called in `ngOnDestroy`) stops reconnection.

## REST API

### `POST /api/config`

Save a new dashboard configuration and trigger WebSocket updates.

**Request Body** (`DashboardState`):

```json
{
  "scenario": "normal",
  "cmd": {
    "sides": ["left", "right"],
    "wheels": ["1", "2"]
  },
  "operations": {
    "ttm": "captive",
    "weather": "no",
    "videoRec": "internal",
    "videoType": ["no"],
    "headlights": "no",
    "pwrOnOff": "on",
    "force": "normal",
    "stability": "no",
    "cruiseCtrl": "no",
    "plr": "no",
    "aux": "no"
  }
}
```

**Response** (`200 OK`):

```json
{
  "status": "accepted",
  "updatesScheduled": 11,
  "affectedColumns": ["L1", "L2", "R1", "R2"]
}
```

**Error** (`400 Bad Request`):

```json
{
  "error": "Invalid payload: operations required"
}
```

### `GET /api/config`

Retrieve the last saved configuration.

**Response** (`200 OK`): Returns the full `DashboardState` object.

**Response** (`404 Not Found`): `{ "error": "No config saved yet" }`

### `POST /api/rare-config`

Save a new rare CMDs configuration and trigger WebSocket updates.

**Request Body** (`RareDashboardState`):

```json
{
  "scenario": "highway-cruise",
  "cmd": {
    "sides": ["left", "right"],
    "wheels": ["1", "2"]
  },
  "rareOperations": {
    "absCriticalFail": "normal",
    "absWarningFail": "normal",
    "absFatalFail": "normal",
    "brakeCriticalFail": "normal",
    "masterResetFail": "normal",
    "flashCriticalFail": "normal",
    "busTempFail": "normal",
    "tireCommFail": "no",
    "fuelMapTempFail": "normal",
    "coolantCriticalFail": "normal"
  }
}
```

**Response** (`200 OK`):

```json
{
  "status": "accepted",
  "updatesScheduled": 10,
  "scenario": "highway-cruise"
}
```

**Error** (`400 Bad Request`):

```json
{
  "error": "Invalid payload: rareOperations required"
}
```

### `GET /api/rare-config`

Returns the last saved rare configuration, or 404 if none has been saved yet.

**Response** (`200 OK`): Returns the full `RareDashboardState` object.

**Error Response** (`404 Not Found`):

```json
{
  "error": "No rare config saved yet"
}
```

### `GET /api/health`

Health check endpoint.

**Response** (`200 OK`):

```json
{
  "status": "ok",
  "uptime": 123.45,
  "clients": 2
}
```

## WebSocket Protocol

### Endpoint

`ws://localhost:3000/api/ws` (or `wss://` over TLS).

### Messages (Server → Client)

Each message is a JSON-serialized `FieldUpdate`:

```json
{
  "field": "ttm",
  "cells": {
    "L1": { "value": "captive", "abbr": "CAP" },
    "L2": { "value": "captive", "abbr": "CAP" },
    "R1": { "value": "captive", "abbr": "CAP" },
    "R2": { "value": "captive", "abbr": "CAP" }
  }
}
```

**Fields**:

| Field    | Type                           | Description                                                 |
| -------- | ------------------------------ | ----------------------------------------------------------- |
| `field`  | `string`                       | Operation key matching model property                       |
| `cells`  | `Record<string, CellValue>`    | Column ID → `{ value, abbr }` for affected columns only    |

**CellValue**: `{ value: string; abbr: string }` — abbreviation is resolved server-side via `resolveAbbr`.

### Message Timing

Updates are sent with a staggered delay (`WS_UPDATE_DELAY_MS * index`), creating a progressive fill effect in the grid. Default delay is 300ms per update, so 11 updates complete in ~3.3 seconds.

### Column Determination

The server uses the `cmd.sides × cmd.wheels` from the POST payload to determine which columns to include in each `FieldUpdate.cells`. For example:

- `sides: ['left'], wheels: ['1', '2']` → cells include `L1` and `L2` only
- `sides: ['left', 'right'], wheels: ['1', '2', '3', '4']` → cells include `L1, L2, L3, L4, R1, R2, R3, R4` (all 8)

## Simulation Engine

### `processConfig(state: DashboardState) → FieldUpdate[]`

For each operation key in `state.operations` (11 fields) and `state.cmdTest` (3 fields), the engine:

1. Reads the raw value.
2. Uses `cmd.sides × cmd.wheels` to determine affected columns.
3. Resolves abbreviation via `resolveAbbr(rawValue, abbrMap)` using per-field abbreviation maps.
4. Builds a `cells` record with `CellValue { value, abbr }` for each affected column.
5. For multi-select values (arrays), joins them with commas (e.g., `['hd', '4k']` → `'hd,4k'`, abbr: `'HD,4K'`).

### `processRareConfig(state: RareDashboardState) → FieldUpdate[]`

For each of the 10 rare operation keys in `state.rareOperations`, the engine:

1. Reads the raw value (Normal/Force/Ignore or Yes/No).
2. Uses `cmd.sides × cmd.wheels` to determine affected columns (L1–R4).
3. Resolves abbreviation via `resolveAbbr(rawValue, abbrMap)`.
4. Builds a `cells` record with `CellValue { value, abbr }` for each affected column.
5. For TTL/TTR fields (absFatalFail, brakeCriticalFail, busTempFail, tireCommFail): adds TTL cell when left side selected, TTR cell when right side selected.
6. For SSL fields (fuelMapTempFail, coolantCriticalFail): always adds SSL cell.

## File Structure

```
server/
├── tsconfig.json             # TypeScript config (target: es2017, module: commonjs)
└── src/
    ├── index.ts              # Express app + WebSocket server + static serving
    │                         # Handles /api/config, /api/rare-config, /api/health, /api/ws
    ├── models.ts             # Shared types: DashboardState, RareDashboardState, FieldUpdate,
    │                         # CmdSelection, OperationsValue, CmdTestValue, RareOperationsValue
    └── simulation-engine.ts  # processConfig() + processRareConfig() — update generation
```

## Configuration

| Environment Variable | Default | Description                            |
| -------------------- | ------- | -------------------------------------- |
| `PORT`               | `3000`  | HTTP/WS server port                    |
| `WS_UPDATE_DELAY_MS` | `300`   | Delay between sequential WS broadcasts |

## Development Setup

### Dev Mode (Angular + Server)

Two terminals:

```bash
# Terminal 1 — Server
npm run server:start

# Terminal 2 — Angular dev server (proxies /api to :3000)
npm start
```

The Angular dev server (`ng serve` on port 4200) proxies `/api/*` (including WebSocket at `/api/ws`) to the Node server on port 3000 via `proxy.conf.json`.

### Production Mode

```bash
# Build Angular
npm run build

# Build server
npm run server:build

# Run production server (serves Angular + API + WS on port 3000)
npm run server:prod
```

## Security Considerations

- CORS is enabled for development convenience. In production, restrict origins.
- No authentication — this is a playground/demo server.
- No input sanitization beyond JSON parsing — acceptable for an internal simulation tool.

## Related Docs

- [Config Dashboard Spec](../1-config-dashboard/spec.md)
- [Data Model](../1-config-dashboard/data-model.md)
- [README](../../README.md)
