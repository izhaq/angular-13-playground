# Server Spec: Driving Simulation Backend

**Feature**: 2-server
**Date**: 2026-04-09

---

## Overview

A lightweight Node.js/Express server that acts as the backend for the Driving Simulation Configuration Dashboard. It provides:

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
            │  │  Path: /ws                      │    │
            │  │  Broadcasts FieldUpdate[]       │    │
            │  └────────────────────────────────┘    │
            └────────────────────────────────────────┘
```

## Data Flow

### Save Configuration

1. User clicks **Save** in the Angular dashboard.
2. `DashboardStateService.saveConfig()` sends `POST /api/config` with the full `DashboardState` body.
3. Server receives the payload, passes it to `processConfig()`.
4. `processConfig()` generates a `FieldUpdate[]` — one update per vehicle control field — with deterministic statuses derived from the field key + value hash.
5. Server broadcasts each `FieldUpdate` over WebSocket to all connected clients, staggered by `WS_UPDATE_DELAY_MS` (default 300ms) to simulate progressive processing.
6. Client's `StatusGridService` receives each message via its WebSocket `onmessage` handler and calls `applyUpdate()` to update the status grid in real time.

### WebSocket Reconnection

`StatusGridService` implements auto-reconnect with a 3-second delay. When the WebSocket connection is closed (server restart, network drop), it schedules a reconnect. The `disconnect()` method (called in `ngOnDestroy`) stops reconnection.

## REST API

### `POST /api/config`

Save a new dashboard configuration and trigger WebSocket updates.

**Request Body** (`DashboardState`):

```json
{
  "scenario": "highway-cruise",
  "driveCommand": {
    "transmission": "automatic",
    "driveMode": "2wd"
  },
  "vehicleControls": {
    "terrain": ["asphalt"],
    "weather": ["clear"],
    "speedLimit": "90",
    "gear": "p",
    "headlights": "off",
    "wipers": "off",
    "tractionCtrl": "on",
    "stability": "esc-on",
    "cruiseCtrl": "off",
    "brakeAssist": "abs-ebd"
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
  "error": "Invalid payload: vehicleControls required"
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

`ws://localhost:3000/ws` (or `wss://` over TLS).

### Messages (Server → Client)

Each message is a JSON-serialized `FieldUpdate`:

```json
{
  "field": "vehicleControls.terrain",
  "value": "Gravel, Sand",
  "statuses": {
    "red": true,
    "yellow": false,
    "green": true,
    "n": false,
    "p": true,
    "l": false
  }
}
```

**Fields**:

| Field      | Type                       | Description                                         |
| ---------- | -------------------------- | --------------------------------------------------- |
| `field`    | `string`                   | Dot-path identifying the vehicle control field       |
| `value`    | `string` (optional)        | Human-readable confirmed value for the info column   |
| `statuses` | `Record<string, boolean>` (optional) | Column activation states keyed by column ID |

### Message Timing

Updates are sent with a staggered delay (`WS_UPDATE_DELAY_MS * index`), creating a progressive fill effect in the grid. Default delay is 300ms per update, so 10 updates complete in ~3 seconds.

## Simulation Engine

`processConfig(state: DashboardState) → FieldUpdate[]`

For each vehicle control key, the engine:

1. Reads the raw value from `state.vehicleControls[key]`.
2. Formats multi-select arrays as comma-separated strings (e.g., `["gravel", "sand"]` → `"gravel, sand"`).
3. Generates deterministic boolean statuses using a hash of `key + JSON.stringify(value)`, ensuring the same input always produces the same grid pattern.

## File Structure

```
server/
├── tsconfig.json             # TypeScript config (target: es2017, module: commonjs)
└── src/
    ├── index.ts              # Express app + WebSocket server + static serving
    ├── models.ts             # Shared types (DashboardState, FieldUpdate, etc.)
    └── simulation-engine.ts  # processConfig() — deterministic update generation
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

# Terminal 2 — Angular dev server (proxies /api and /ws to :3000)
npm start
```

The Angular dev server (`ng serve` on port 4200) proxies `/api/*` and `/ws` to the Node server on port 3000 via `proxy.conf.json`.

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
