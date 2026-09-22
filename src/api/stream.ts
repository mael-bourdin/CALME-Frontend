import { STREAM_RECONNECT_DELAYS_MS, WS_BASE_URL } from './config';
import type { SessionStream } from './transport';
import type { ConnectionState, StreamEvent } from './types';

/**
 * WebSocket vers `/api/v1/sessions/{id}/stream`, avec reconnexion.
 *
 * La démonstration prévoit qu'on débranche le réseau en pleine séance : la
 * séance doit continuer, l'interface doit le dire, et la courbe doit se recoller
 * au retour. Ce client ne ferme donc jamais de lui-même, il retente avec un
 * délai qui s'allonge, et il expose son état pour que l'écran l'affiche.
 */
export function createLiveStream(sessionId: string): SessionStream {
  const handlers = new Set<(event: StreamEvent) => void>();
  const stateHandlers = new Set<(state: ConnectionState) => void>();

  let socket: WebSocket | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let state: ConnectionState = 'connecting';

  function setState(next: ConnectionState) {
    if (state === next) return;
    state = next;
    for (const handler of stateHandlers) handler(next);
  }

  function scheduleReconnect() {
    if (disposed) return;
    const delay =
      STREAM_RECONNECT_DELAYS_MS[Math.min(attempt, STREAM_RECONNECT_DELAYS_MS.length - 1)];
    attempt += 1;
    setState(attempt > 2 ? 'offline' : 'reconnecting');
    retryTimer = setTimeout(connect, delay);
  }

  function connect() {
    if (disposed) return;
    try {
      socket = new WebSocket(`${WS_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/stream`);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      setState('open');
    };

    socket.onmessage = (message) => {
      let event: StreamEvent;
      try {
        event = JSON.parse(message.data as string) as StreamEvent;
      } catch {
        // Un message illisible ne doit pas tuer le flux : on l'ignore.
        return;
      }
      for (const handler of handlers) handler(event);
    };

    socket.onerror = () => {
      socket?.close();
    };

    socket.onclose = () => {
      socket = null;
      if (!disposed) scheduleReconnect();
    };
  }

  connect();

  return {
    get state() {
      return state;
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    onConnectionChange(handler) {
      stateHandlers.add(handler);
      handler(state);
      return () => stateHandlers.delete(handler);
    },
    close() {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
      socket = null;
      setState('closed');
      handlers.clear();
      stateHandlers.clear();
    },
  };
}
