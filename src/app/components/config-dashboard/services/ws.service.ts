import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { WsConnection } from '../components/status-grid/ws-connection';
import { FieldUpdate } from '../components/status-grid/grid.models';

@Injectable()
export class WsService implements OnDestroy {
  private readonly messageSubject = new Subject<FieldUpdate>();
  private readonly wsConnection: WsConnection;

  readonly message$: Observable<FieldUpdate> = this.messageSubject.asObservable();

  constructor(zone: NgZone) {
    this.wsConnection = new WsConnection(zone, {
      onMessage: (data) => this.handleMessage(data),
    });
  }

  connect(): void {
    this.wsConnection.connect();
  }

  disconnect(): void {
    this.wsConnection.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.messageSubject.complete();
  }

  private handleMessage(data: string): void {
    try {
      const update: FieldUpdate = JSON.parse(data);
      this.messageSubject.next(update);
    } catch (err) {
      console.error('[WsService] Invalid message:', data);
    }
  }
}
