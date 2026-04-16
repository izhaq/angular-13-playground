# API Reference

## REST API

Base URL: `http://localhost:3000`

---

### POST /api/config

Save the current dashboard configuration. Triggers WebSocket updates to all connected clients.

**Request Body** — `DashboardState`

```typescript
interface DashboardState {
  scenario: string;
  cmd: {
    sides: string[];   // e.g. ["left"], ["right"], ["left", "right"]
    wheels: string[];   // e.g. ["1"], ["1", "2", "3", "4"]
  };
  operations: {
    ttm: string;        // "not-active" | "real" | "captive"
    weather: string;    // "no" | "yes"
    videoRec: string;   // "internal" | "external"
    videoType: string[]; // ["no"] | ["hd", "4k"] | ["hd", "4k", "8k"]
    headlights: string; // "no" | "yes"
    pwrOnOff: string;   // "on" | "off"
    force: string;      // "normal" | "force-f" | "force-no"
    stability: string;  // "no" | "yes"
    cruiseCtrl: string; // "no" | "yes"
    plr: string;        // "no" | "yes"
    aux: string;        // "no" | "yes"
  };
}
```

**Example Request**

```json
{
  "scenario": "highway-cruise",
  "cmd": {
    "sides": ["left"],
    "wheels": ["1", "2"]
  },
  "operations": {
    "ttm": "captive",
    "weather": "no",
    "videoRec": "internal",
    "videoType": ["hd", "4k"],
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

**Response** — `200 OK`

```json
{
  "status": "accepted",
  "updatesScheduled": 11,
  "scenario": "highway-cruise"
}
```

**Error Response** — `400 Bad Request`

```json
{
  "error": "Invalid payload: operations required"
}
```

---

### GET /api/config

Returns the last saved configuration, or 404 if none has been saved yet.

**Response** — `200 OK`

Returns the full `DashboardState` object (same structure as the POST request body).

**Error Response** — `404 Not Found`

```json
{
  "error": "No config saved yet"
}
```

---

### POST /api/rare-config

Save a rare CMDs tab configuration. Triggers WebSocket updates to all connected clients.

**Request Body** — `RareDashboardState`

```typescript
interface RareDashboardState {
  scenario: string;
  cmd: {
    sides: string[];
    wheels: string[];
  };
  rareOperations: {
    absCriticalFail: string;     // "normal" | "force" | "ignore"
    absWarningFail: string;      // "normal" | "force" | "ignore"
    absFatalFail: string;        // "normal" | "force" | "ignore"
    brakeCriticalFail: string;   // "normal" | "force" | "ignore"
    masterResetFail: string;     // "normal" | "force" | "ignore"
    flashCriticalFail: string;   // "normal" | "force" | "ignore"
    busTempFail: string;         // "normal" | "force" | "ignore"
    tireCommFail: string;        // "no" | "yes"
    fuelMapTempFail: string;     // "normal" | "force" | "ignore"
    coolantCriticalFail: string; // "normal" | "force" | "ignore"
  };
}
```

**Example Request**

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
    "absFatalFail": "force",
    "brakeCriticalFail": "normal",
    "masterResetFail": "normal",
    "flashCriticalFail": "ignore",
    "busTempFail": "normal",
    "tireCommFail": "no",
    "fuelMapTempFail": "normal",
    "coolantCriticalFail": "normal"
  }
}
```

**Response** — `200 OK`

```json
{
  "status": "accepted",
  "updatesScheduled": 10,
  "scenario": "highway-cruise"
}
```

**Error Response** — `400 Bad Request`

```json
{
  "error": "Invalid payload: rareOperations required"
}
```

---

### GET /api/rare-config

Returns the last saved rare configuration, or 404 if none has been saved yet.

**Response** — `200 OK`

Returns the full `RareDashboardState` object (same structure as the POST request body).

**Error Response** — `404 Not Found`

```json
{
  "error": "No rare config saved yet"
}
```

---

### GET /api/health

Health check endpoint.

**Response** — `200 OK`

```json
{
  "status": "ok",
  "uptime": 123.456,
  "clients": 2
}
```

---

## WebSocket

Endpoint: `ws://localhost:3000/api/ws`

The client connects on page load via `WsService` (single shared connection). After a successful `POST /api/config` or `POST /api/rare-config`, the server broadcasts a series of `FieldUpdate` messages to all connected clients. Each message corresponds to one operation field. The client-side `StatusGridService` instances filter by their configured row definitions — unknown fields are silently ignored.

### Message Format — `FieldUpdate`

```typescript
interface CellValue {
  value: string;  // raw value (e.g. "captive", "normal")
  abbr: string;   // abbreviation resolved server-side (e.g. "CAP", "NRM")
}

interface FieldUpdate {
  field: string;                     // operations key (e.g. "ttm", "force", "videoType")
  cells: Record<string, CellValue>;  // columnId -> CellValue
}
```

### Column IDs

Column IDs are computed from the CMD selection: `side prefix + wheel number`.

| Side   | Prefix | Columns (all wheels)   |
|--------|--------|------------------------|
| left   | L      | L1, L2, L3, L4         |
| right  | R      | R1, R2, R3, R4         |

Only columns matching the selected sides and wheels are included in the update.

### Example Messages

**Single-select field** — user selected Left side, Wheels 1+2, TTM = "captive":

```json
{ "field": "ttm", "cells": { "L1": { "value": "captive", "abbr": "CAP" }, "L2": { "value": "captive", "abbr": "CAP" } } }
```

**Multi-select field** — user selected Left side, Wheel 1, Video Type = ["hd", "4k"]:

```json
{ "field": "videoType", "cells": { "L1": { "value": "hd,4k", "abbr": "HD,4K" } } }
```

**All wheels, both sides** — Force = "normal":

```json
{
  "field": "force",
  "cells": {
    "L1": { "value": "normal", "abbr": "NRM" }, "L2": { "value": "normal", "abbr": "NRM" },
    "L3": { "value": "normal", "abbr": "NRM" }, "L4": { "value": "normal", "abbr": "NRM" },
    "R1": { "value": "normal", "abbr": "NRM" }, "R2": { "value": "normal", "abbr": "NRM" },
    "R3": { "value": "normal", "abbr": "NRM" }, "R4": { "value": "normal", "abbr": "NRM" }
  }
}
```

### Server-Side Abbreviation Mapping

Abbreviation resolution is performed server-side in `simulation-engine.ts` via the `resolveAbbr` function. The server sends both the raw value and the resolved abbreviation as `CellValue { value, abbr }`. The client renders `abbr` in grid cells and shows `value` in cell hover popouts.

| Field      | Value       | Abbreviation |
|------------|-------------|--------------|
| ttm        | not-active  | N/A          |
| ttm        | real        | REA          |
| ttm        | captive     | CAP          |
| weather    | no          | NO           |
| weather    | yes         | YES          |
| videoRec   | internal    | INT          |
| videoRec   | external    | EXT          |
| videoType  | no          | NO           |
| videoType  | hd          | HD           |
| videoType  | 4k          | 4K           |
| videoType  | 8k          | 8K           |
| headlights | no          | NO           |
| headlights | yes         | YES          |
| pwrOnOff   | on          | ON           |
| pwrOnOff   | off         | OFF          |
| force      | normal      | NRM          |
| force      | force-f     | FRC          |
| force      | force-no    | FNO          |
| stability  | no          | NO           |
| stability  | yes         | YES          |
| cruiseCtrl | no          | NO           |
| cruiseCtrl | yes         | YES          |
| plr        | no          | NO           |
| plr        | yes         | YES          |
| aux        | no          | NO           |
| aux        | yes         | YES          |

For multi-select fields, comma-separated values are mapped individually: `"hd,4k"` becomes `"HD,4K"`.

### Rare Operations Abbreviation Mapping (Tab 2)

9 fields use Normal/Force/Ignore options; 1 field (tireCommFail) uses Yes/No.

| Field               | Value   | Abbreviation |
|---------------------|---------|--------------|
| absCriticalFail     | normal  | NRM          |
| absCriticalFail     | force   | FRC          |
| absCriticalFail     | ignore  | IGN          |
| absWarningFail      | normal  | NRM          |
| absWarningFail      | force   | FRC          |
| absWarningFail      | ignore  | IGN          |
| absFatalFail        | normal  | NRM          |
| absFatalFail        | force   | FRC          |
| absFatalFail        | ignore  | IGN          |
| brakeCriticalFail   | normal  | NRM          |
| brakeCriticalFail   | force   | FRC          |
| brakeCriticalFail   | ignore  | IGN          |
| masterResetFail     | normal  | NRM          |
| masterResetFail     | force   | FRC          |
| masterResetFail     | ignore  | IGN          |
| flashCriticalFail   | normal  | NRM          |
| flashCriticalFail   | force   | FRC          |
| flashCriticalFail   | ignore  | IGN          |
| busTempFail         | normal  | NRM          |
| busTempFail         | force   | FRC          |
| busTempFail         | ignore  | IGN          |
| tireCommFail        | no      | NO           |
| tireCommFail        | yes     | YES          |
| fuelMapTempFail     | normal  | NRM          |
| fuelMapTempFail     | force   | FRC          |
| fuelMapTempFail     | ignore  | IGN          |
| coolantCriticalFail | normal  | NRM          |
| coolantCriticalFail | force   | FRC          |
| coolantCriticalFail | ignore  | IGN          |

**Extra columns for Rare CMDs grid**: TTL, TTR, SSL — populated server-side based on field rules (see spec).

### Timing

Updates are broadcast sequentially with a configurable delay between each (default: 300ms). For 11 fields, the full update completes in ~3.3 seconds.
