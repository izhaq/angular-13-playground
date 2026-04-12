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

The client connects on page load. After a successful `POST /api/config`, the server broadcasts a series of `FieldUpdate` messages to all connected clients. Each message corresponds to one of the 11 operations fields.

### Message Format — `FieldUpdate`

```typescript
interface FieldUpdate {
  field: string;                  // operations key (e.g. "ttm", "force", "videoType")
  cells: Record<string, string>;  // columnId -> raw value key
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
{ "field": "ttm", "cells": { "L1": "captive", "L2": "captive" } }
```

**Multi-select field** — user selected Left side, Wheel 1, Video Type = ["hd", "4k"]:

```json
{ "field": "videoType", "cells": { "L1": "hd,4k" } }
```

**All wheels, both sides** — Force = "normal":

```json
{
  "field": "force",
  "cells": {
    "L1": "normal", "L2": "normal", "L3": "normal", "L4": "normal",
    "R1": "normal", "R2": "normal", "R3": "normal", "R4": "normal"
  }
}
```

### Client-Side Abbreviation Mapping

The server returns raw value keys (e.g. `"captive"`, `"hd,4k"`). The client maps these to display abbreviations before rendering in the grid. The mapping is defined in `OPERATIONS_FIELDS` on the client:

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

### Timing

Updates are broadcast sequentially with a configurable delay between each (default: 300ms). For 11 fields, the full update completes in ~3.3 seconds.
