import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { buildInitialGridRows } from '../models/dashboard-defaults';
import {
  FieldUpdate,
  GridColumnDef,
  RowViewModel,
} from '../models/grid.models';
import { GRID_COLUMNS } from '../../../mocks/mock-data';
import { OPERATIONS_FIELDS } from '../components/operations-list/operations-list.models';

const RECONNECT_DELAY_MS = 3000;

type AbbrLookup = Record<string, Record<string, string>>;

function buildAbbrLookup(): AbbrLookup {
  const lookup: AbbrLookup = {};
  for (const field of OPERATIONS_FIELDS) {
    const map: Record<string, string> = {};
    for (const opt of field.options) {
      if (opt.abbr) {
        map[opt.value] = opt.abbr;
      }
    }
    lookup[field.key] = map;
  }
  return lookup;
}

@Injectable({
  providedIn: 'root',
})
export class StatusGridService {
  private readonly columns: GridColumnDef[] = GRID_COLUMNS;
  private readonly abbrLookup: AbbrLookup = buildAbbrLookup();
  private rows: RowViewModel[] = buildInitialGridRows(this.columns);

  private readonly rowsSubject = new BehaviorSubject<RowViewModel[]>(this.rows);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  readonly gridRows$ = this.rowsSubject.asObservable();

  constructor(private readonly zone: NgZone) {}

  get columnCount(): number {
    return this.columns.length;
  }

  applyUpdate(update: FieldUpdate): void {
    const index = this.rows.findIndex(r => r.field === update.field);
    if (index === -1) {
      return;
    }

    const resolvedCells: Record<string, string> = {};
    const fieldMap = this.abbrLookup[update.field];

    for (const [colId, rawValue] of Object.entries(update.cells)) {
      resolvedCells[colId] = this.resolveAbbr(rawValue, fieldMap);
    }

    const row = this.rows[index];
    this.rows = [
      ...this.rows.slice(0, index),
      {
        ...row,
        cells: { ...row.cells, ...resolvedCells },
      },
      ...this.rows.slice(index + 1),
    ];

    this.rowsSubject.next(this.rows);
  }

  connect(): void {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  resetToDefaults(): void {
    this.rows = buildInitialGridRows(this.columns);
    this.rowsSubject.next(this.rows);
  }

  private resolveAbbr(rawValue: string, fieldMap?: Record<string, string>): string {
    if (!fieldMap) {
      return rawValue;
    }

    if (rawValue.includes(',')) {
      return rawValue
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => fieldMap[part] ?? part)
        .join(',');
    }

    return fieldMap[rawValue] ?? rawValue;
  }

  private openSocket(): void {
    if (this.socket) {
      this.socket.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/api/ws`;

    this.zone.runOutsideAngular(() => {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[StatusGridService] WebSocket connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const update: FieldUpdate = JSON.parse(event.data);
          this.zone.run(() => this.applyUpdate(update));
        } catch (err) {
          console.error('[StatusGridService] Invalid message:', event.data);
        }
      };

      this.socket.onclose = () => {
        console.log('[StatusGridService] WebSocket closed');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        console.error('[StatusGridService] WebSocket error');
        this.socket?.close();
      };
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      console.log('[StatusGridService] Reconnecting...');
      this.openSocket();
    }, RECONNECT_DELAY_MS);
  }
}
