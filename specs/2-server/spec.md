# Server Spec: Configuration Dashboard Backend (Revised)

**Feature**: 2-server
**Date**: 2026-04-09 (original) | 2026-04-09 (revised for new requirements)

---

## Overview

A lightweight Node.js/Express server that acts as the backend for the Configuration Dashboard. It provides:

1. A **REST API** to receive and persist configuration changes from the Angular client.
2. A **WebSocket server** to push real-time `FieldUpdate` messages back to the client's status grid after configuration is saved.
3. **Static file serving** for the production Angular build (`dist/`).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Angular Client                     │
│  ┌───────────────┐          ┌────────────────────┐  │
│  │ DashboardState│ POST     │  StatusGridService  │  │
│  │   Service     │──────┐   │  (WebSocket client) │  │
│  └───────────────┘      │   └─────────┬──────────┘  │
│                          │             │ onmessage    │
└──────────────────────────│─────────────│─────────────┘
                           │             │
            ┌──────────────▼─────────────▼──────────┐
            │          Node.js Server                │
            │  ┌────────────────────────────────┐    │
            │  │  Express (REST)                │    │
            │  │  POST /api/config              │    │
            │  │  GET  /api/config              │    │
            │  │  GET  /api/health              │    │
            │  └──────────────┬─────────────────┘    │
            │                 │                      │
            │  ┌──────────────▼─────────────────┐    │
            │  │  Simulation Engine              │    │
            │  │  processConfig(state) → updates │    │
            │  └──────────────┬─────────────────┘    │
            │                 │                      │
            │  ┌──────────────▼─────────────────┐    │
            │  │  WebSocket Server (ws)          │    │
            │  │  Path: /api/ws                  │    │
            │  │  Broadcasts FieldUpdate[]       │    │
            │  └────────────────────────────────┘    │
            └────────────────────────────────────────┘
```

## Data Flow

### Save Configuration

1. User clicks **Save** in the Angular dashboard.
2. `DashboardStateService.saveConfig()` sends `POST /api/config` with the `DashboardState` body (scenario, cmd selections, operations values).
3. Server receives the payload, passes it to `processConfig()`.
4. `processConfig()` uses `cmd.sides × cmd.wheels` to determine which grid columns are affected, then generates a `FieldUpdate[]` — one per operation — with abbreviation strings for the affected columns.
5. Server broadcasts each `FieldUpdate` over WebSocket to all connected clients, staggered by `WS_UPDATE_DELAY_MS` (default 300ms).
6. Client's `StatusGridService` receives each message and calls `applyUpdate()` to merge abbreviations into the grid.

### WebSocket Reconnection

`StatusGridService` implements auto-reconnect with a 3-second delay. `disconnect()` (called in `ngOnDestroy`) stops reconnection.

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
  "field": "row1",
  "cells": {
    "L1": "CAP",
    "L2": "CAP",
    "R1": "CAP",
    "R2": "CAP"
  }
}
```

**Fields**:

| Field    | Type                      | Description                                                 |
| -------- | ------------------------- | ----------------------------------------------------------- |
| `field`  | `string`                  | Operation key matching `OperationsValue` property           |
| `cells`  | `Record<string, string>`  | Column ID → 3-letter abbreviation for affected columns only |

### Message Timing

Updates are sent with a staggered delay (`WS_UPDATE_DELAY_MS * index`), creating a progressive fill effect in the grid. Default delay is 300ms per update, so 11 updates complete in ~3.3 seconds.

### Column Determination

The server uses the `cmd.sides × cmd.wheels` from the POST payload to determine which columns to include in each `FieldUpdate.cells`. For example:

- `sides: ['left'], wheels: ['1', '2']` → cells include `L1` and `L2` only
- `sides: ['left', 'right'], wheels: ['1', '2', '3', '4']` → cells include `L1, L2, L3, L4, R1, R2, R3, R4` (all 8)

## Simulation Engine

`processConfig(state: DashboardState) → FieldUpdate[]`

For each operation key in `state.operations`, the engine:

1. Reads the raw value.
2. Looks up the abbreviation from the option config (e.g., `'captive'` → `'CAP'`).
3. For multi-select values (arrays), concatenates abbreviations (e.g., `['no']` → `'NO'`).
4. Builds a `cells` record with the abbreviation for each affected column (determined by `cmd.sides × cmd.wheels`).

## File Structure

```
server/
├── tsconfig.json             # TypeScript config (target: es2017, module: commonjs)
└── src/
    ├── index.ts              # Express app + WebSocket server + static serving
    ├── models.ts             # Shared types (DashboardState, FieldUpdate, CmdSelection, OperationsValue)
    └── simulation-engine.ts  # processConfig() — abbreviation-based update generation
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
