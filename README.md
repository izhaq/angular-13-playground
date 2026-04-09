# Driving Simulation Dashboard

An Angular 13 playground application with a Node.js backend — a configuration dashboard for a driving simulation demo.

## Architecture

```
Angular Client (port 4200)          Node.js Server (port 3000)
┌─────────────────────┐            ┌─────────────────────────┐
│  Config Dashboard   │            │  Express REST API       │
│  ┌───────┐ ┌──────┐ │  POST      │  POST /api/config       │
│  │ Left  │ │Status│ │──────────→ │  GET  /api/config       │
│  │ Panel │ │ Grid │ │            │  GET  /api/health       │
│  └───────┘ └──┬───┘ │            ├─────────────────────────┤
│               │     │  WebSocket │  WebSocket Server (/ws) │
│               │◄────│────────────│  Broadcasts FieldUpdate │
└─────────────────────┘            └─────────────────────────┘
```

**Save flow**: User saves config → Angular POSTs to `/api/config` → Server processes and generates grid statuses → Broadcasts `FieldUpdate` messages over WebSocket → Status grid updates in real time.

## Prerequisites

- **Node.js**: v16.x (`node -v`)
- **npm**: v8+ (`npm -v`)

## Getting Started

```bash
# Install dependencies
npm install
```

### Development (Two Terminals)

```bash
# Terminal 1 — Start the Node.js server
npm run server:start

# Terminal 2 — Start Angular dev server (auto-proxies to server)
npm start
```

- Angular app: [http://localhost:4200](http://localhost:4200)
- Server API: [http://localhost:3000](http://localhost:3000)
- Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

The Angular dev server proxies `/api/*` and `/ws` requests to the Node server via `proxy.conf.json`.

### Production

```bash
# Build Angular
npm run build

# Build server TypeScript
npm run server:build

# Run production server (serves Angular + API + WS on port 3000)
npm run server:prod
```

## API Reference

### `POST /api/config`

Save dashboard configuration. Triggers WebSocket broadcast of grid updates.

```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"scenario":"highway-cruise","driveCommand":{"transmission":"automatic","driveMode":"2wd"},"vehicleControls":{"terrain":["asphalt"],"weather":["clear"],"speedLimit":"90","gear":"p","headlights":"off","wipers":"off","tractionCtrl":"on","stability":"esc-on","cruiseCtrl":"off","brakeAssist":"abs-ebd"}}'
```

**Response**: `{ "status": "accepted", "updatesScheduled": 10, "scenario": "highway-cruise" }`

### `GET /api/config`

Returns the last saved configuration, or `404` if none saved yet.

### `GET /api/health`

Returns `{ "status": "ok", "uptime": 123.45, "clients": 2 }`.

### WebSocket (`ws://localhost:3000/ws`)

After a POST to `/api/config`, the server broadcasts `FieldUpdate` messages staggered by 300ms:

```json
{ "field": "vehicleControls.terrain", "value": "Gravel, Sand", "statuses": { "red": true, "yellow": false, "green": true, "n": false, "p": true, "l": false } }
```

## npm Scripts

| Script           | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `npm start`      | Angular dev server (port 4200, proxies to server)    |
| `npm test`       | Run Angular unit tests via Karma                     |
| `npm run build`  | Production build of Angular app                      |
| `npm run server:start` | Start Node.js server with ts-node (dev mode)   |
| `npm run server:build` | Compile server TypeScript to `server/dist/`    |
| `npm run server:prod`  | Run compiled server (serves Angular + API)     |

## Project Structure

```
├── server/                          # Node.js backend
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # Express + WebSocket + static serving
│       ├── models.ts                # Shared TypeScript types
│       └── simulation-engine.ts     # Config → FieldUpdate[] generation
├── src/                             # Angular frontend
│   └── app/
│       ├── mocks/                   # Mock data (scenarios, grid columns)
│       └── components/
│           ├── app-dropdown/        # Reusable dropdown (single + multi)
│           └── config-dashboard/    # Dashboard feature module
│               ├── models/          # DashboardState, grid models
│               ├── services/        # DashboardStateService, StatusGridService
│               └── components/      # top-bar, left-panel, cmd-panel,
│                                    # operations-list, status-grid
├── specs/                           # Feature specifications
│   ├── 1-config-dashboard/          # Dashboard spec, data model, plan
│   └── 2-server/                    # Server API spec
├── proxy.conf.json                  # Angular dev proxy config
├── angular.json
└── package.json
```

## Configuration

| Environment Variable   | Default | Description                            |
| ---------------------- | ------- | -------------------------------------- |
| `PORT`                 | `3000`  | Server port                            |
| `WS_UPDATE_DELAY_MS`   | `300`   | Delay between WebSocket broadcasts (ms)|

## Running Unit Tests

```bash
# Watch mode
npm test

# Single run (CI)
npx ng test --watch=false --browsers=ChromeHeadless

# With coverage
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
```

## Specs & Docs

- [Dashboard Spec](specs/1-config-dashboard/spec.md)
- [Server Spec](specs/2-server/spec.md)
- [Data Model](specs/1-config-dashboard/data-model.md)
- [Portability Guide](portability-guide.md)
