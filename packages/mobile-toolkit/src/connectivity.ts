export type ConnectivityState = {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
  type?: string | null; // wifi/cellular/unknown
};

/**
 * Pure interface so Styx remains tooling-only.
 * Apps can adapt this to RN NetInfo, native reachability, etc.
 */
export interface ConnectivityMonitor {
  getCurrent(): Promise<ConnectivityState>;
  subscribe(handler: (state: ConnectivityState) => void): () => void;
}
