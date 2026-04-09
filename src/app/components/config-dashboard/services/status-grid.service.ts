import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { buildInitialGridRows } from '../models/dashboard-defaults';
import {
  CellViewModel,
  FieldUpdate,
  GridColumn,
  GridRow,
  RowViewModel,
} from '../models/grid.models';
import { GRID_COLUMNS } from '../../../mocks/mock-data';

const DEFAULT_BG = '#ffffff';
const RECONNECT_DELAY_MS = 3000;

@Injectable({
  providedIn: 'root',
})
export class StatusGridService {
  private readonly columns: GridColumn[] = GRID_COLUMNS;
  private rawRows: GridRow[] = buildInitialGridRows(this.columns);

  private readonly viewModelSubject = new BehaviorSubject<RowViewModel[]>(
    this.buildViewModels(this.rawRows)
  );

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  readonly gridRows$ = this.viewModelSubject.asObservable();

  constructor(private readonly zone: NgZone) {}

  get columnCount(): number {
    return this.columns.length;
  }

  applyUpdate(update: FieldUpdate): void {
    const index = this.rawRows.findIndex(r => r.field === update.field);
    if (index === -1) {
      return;
    }

    const row = this.rawRows[index];
    const updatedRow: GridRow = {
      ...row,
      confirmedValue: update.value ?? row.confirmedValue,
      cells: update.statuses
        ? row.cells.map(cell => ({
            ...cell,
            active: update.statuses![cell.columnId] ?? cell.active,
          }))
        : row.cells,
    };

    this.rawRows = [
      ...this.rawRows.slice(0, index),
      updatedRow,
      ...this.rawRows.slice(index + 1),
    ];

    this.viewModelSubject.next(this.buildViewModels(this.rawRows));
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
    this.rawRows = buildInitialGridRows(this.columns);
    this.viewModelSubject.next(this.buildViewModels(this.rawRows));
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

      this.socket.onerror = (err) => {
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

  private buildViewModels(rows: GridRow[]): RowViewModel[] {
    return rows.map((row) => ({
      field: row.field,
      label: row.label,
      confirmedValue: row.confirmedValue,
      cells: row.cells.map((cell, i) => this.buildCellViewModel(cell, i)),
    }));
  }

  private buildCellViewModel(cell: { columnId: string; active: boolean }, index: number): CellViewModel {
    const col = this.columns[index];
    const isActiveColor = cell.active && col?.type === 'color';
    const isActiveText = cell.active && col?.type === 'text';

    return {
      columnId: cell.columnId,
      active: cell.active,
      backgroundColor: isActiveColor ? (col.color ?? DEFAULT_BG) : DEFAULT_BG,
      textLabel: isActiveText ? col.label : '',
      showText: isActiveText,
    };
  }
}
