
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface ViewerInfo {
  id: string;
  name?: string;
  joinTime: number;
}

export interface ShareableData {
  id: string;
  content: any;
  lastUpdate: number;
  type?: 'state-update' | 'delta-update' | 'cursor-move' | 'action' | 'initial-state' | 'request-initial-state';
}

/**
 * Storage Interface - Allows custom implementations (e.g., IndexedDB, Cloud Storage)
 */
export interface StorageAdapter {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

export interface ShareConfig {
  appName: string;
  maxViewers?: number;
  storage?: StorageAdapter;
  iceServers?: RTCIceServer[];
}

export interface ShareSession {
  shareId: string | null;
  status: ConnectionStatus;
  viewers: ViewerInfo[];
  isHost: boolean;
}
