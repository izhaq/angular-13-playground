import { NgZone } from '@angular/core';

export const RECONNECT_DELAY_MS = 3000;

export interface WsConnectionCallbacks {
  onMessage: (data: string) => void;
}

export class WsConnection {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(
    private readonly zone: NgZone,
    private readonly callbacks: WsConnectionCallbacks,
  ) {}

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
        console.log('[WsConnection] WebSocket connected');
      };

      this.socket.onmessage = (event) => {
        this.zone.run(() => this.callbacks.onMessage(event.data));
      };

      this.socket.onclose = () => {
        console.log('[WsConnection] WebSocket closed');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        console.error('[WsConnection] WebSocket error');
        this.socket?.close();
      };
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      console.log('[WsConnection] Reconnecting...');
      this.openSocket();
    }, RECONNECT_DELAY_MS);
  }
}
