/**
 * Oak Chain SDK - Streaming
 * 
 * SSE (Server-Sent Events) client for real-time content updates.
 */

import type {
  SSEEvent,
  SSEEventType,
  ContentChangeEvent,
  EpochFinalizedEvent,
  ContentPath,
  WalletAddress,
} from '../types';

/**
 * SSE connection options
 */
export interface SSEOptions {
  /** Validator endpoint */
  endpoint: string;
  /** Event types to subscribe to */
  eventTypes?: SSEEventType[];
  /** Filter by path prefix */
  pathPrefix?: ContentPath;
  /** Filter by wallet */
  wallet?: WalletAddress;
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
}

/**
 * SSE event handler
 */
export type SSEEventHandler<T = unknown> = (event: SSEEvent<T>) => void;

/**
 * SSE error handler
 */
export type SSEErrorHandler = (error: Error) => void;

/**
 * SSE connection state
 */
export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Oak Chain SSE Client
 * 
 * Subscribes to real-time content updates from validators.
 */
export class OakChainSSE {
  private options: Required<SSEOptions>;
  private eventSource: EventSource | null = null;
  private handlers: Map<SSEEventType | '*', Set<SSEEventHandler>> = new Map();
  private errorHandlers: Set<SSEErrorHandler> = new Set();
  private stateHandlers: Set<(state: SSEConnectionState) => void> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _state: SSEConnectionState = 'disconnected';

  constructor(options: SSEOptions) {
    this.options = {
      eventTypes: ['content-created', 'content-updated', 'content-deleted'],
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      pathPrefix: undefined as unknown as ContentPath,
      wallet: undefined as unknown as WalletAddress,
      ...options,
    };
  }

  /**
   * Current connection state
   */
  get state(): SSEConnectionState {
    return this._state;
  }

  /**
   * Connect to SSE stream
   */
  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.setState('connecting');

    const url = this.buildUrl();
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('connected');
    };

    this.eventSource.onerror = () => {
      const error = new Error('SSE connection error');
      this.notifyError(error);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.setState('disconnected');
        this.handleReconnect();
      } else {
        this.setState('error');
      }
    };

    // Register event listeners for each type
    this.options.eventTypes.forEach(eventType => {
      this.eventSource?.addEventListener(eventType, (event: MessageEvent) => {
        this.handleEvent(eventType, event);
      });
    });

    // Also listen for generic message events
    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleEvent('*' as SSEEventType, event);
    };
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
  }

  /**
   * Subscribe to events
   */
  on<T = unknown>(eventType: SSEEventType | '*', handler: SSEEventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as SSEEventHandler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler as SSEEventHandler);
    };
  }

  /**
   * Subscribe to content changes
   */
  onContentChange(handler: SSEEventHandler<ContentChangeEvent>): () => void {
    const unsubCreated = this.on('content-created', handler);
    const unsubUpdated = this.on('content-updated', handler);
    const unsubDeleted = this.on('content-deleted', handler);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }

  /**
   * Subscribe to epoch finalization
   */
  onEpochFinalized(handler: SSEEventHandler<EpochFinalizedEvent>): () => void {
    return this.on('epoch-finalized', handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: SSEErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: (state: SSEConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  // ===========================================================================
  // PRIVATE
  // ===========================================================================

  private buildUrl(): string {
    const url = new URL('/v1/events/stream', this.options.endpoint);

    if (this.options.eventTypes.length > 0) {
      url.searchParams.set('events', this.options.eventTypes.join(','));
    }

    if (this.options.pathPrefix) {
      url.searchParams.set('path', this.options.pathPrefix);
    }

    if (this.options.wallet) {
      url.searchParams.set('wallet', this.options.wallet);
    }

    return url.toString();
  }

  private handleEvent(eventType: SSEEventType | '*', event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        type: eventType === '*' ? (data.type || 'unknown') : eventType,
        id: event.lastEventId || crypto.randomUUID(),
        timestamp: Date.now(),
        data,
      };

      // Notify specific handlers
      this.handlers.get(eventType)?.forEach(handler => {
        try {
          handler(sseEvent);
        } catch (error) {
          console.error('SSE handler error:', error);
        }
      });

      // Notify wildcard handlers
      if (eventType !== '*') {
        this.handlers.get('*')?.forEach(handler => {
          try {
            handler(sseEvent);
          } catch (error) {
            console.error('SSE handler error:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
    }
  }

  private handleReconnect(): void {
    if (!this.options.autoReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.notifyError(new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setState(state: SSEConnectionState): void {
    this._state = state;
    this.stateHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('State handler error:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error handler error:', e);
      }
    });
  }
}

/**
 * Create SSE client
 */
export function createSSEClient(options: SSEOptions): OakChainSSE {
  return new OakChainSSE(options);
}

// =============================================================================
// REACT HOOKS (if React is available)
// =============================================================================

/**
 * React hook for SSE subscription
 * 
 * Usage:
 * ```tsx
 * const { state, events } = useOakChainSSE({
 *   endpoint: 'https://validators.oak-chain.io',
 *   eventTypes: ['content-updated'],
 * });
 * ```
 */
export function useOakChainSSE(options: SSEOptions): {
  state: SSEConnectionState;
  events: SSEEvent[];
  connect: () => void;
  disconnect: () => void;
} {
  void options;
  // This is a placeholder - actual implementation requires React
  // Will be implemented when React is a peer dependency
  throw new Error(
    'useOakChainSSE requires React. Import from @oak-chain/sdk/react instead.'
  );
}
