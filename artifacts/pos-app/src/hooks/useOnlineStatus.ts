import { useState, useEffect, useCallback } from "react";

type SyncStatus = {
  isOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
};

let _listeners: Array<(s: SyncStatus) => void> = [];
let _state: SyncStatus = {
  isOnline: navigator.onLine,
  queuedCount: 0,
  isSyncing: false,
};

function notify() {
  for (const fn of _listeners) fn({ ..._state });
}

export function getSyncStatus() {
  return { ..._state };
}

export function setSyncStatus(partial: Partial<SyncStatus>) {
  _state = { ..._state, ...partial };
  notify();
}

export function useOnlineStatus(): SyncStatus {
  const [state, setState] = useState<SyncStatus>(() => ({ ..._state }));

  useEffect(() => {
    _listeners.push(setState);
    setState({ ..._state });

    const onOnline = () => {
      _state = { ..._state, isOnline: true };
      notify();
    };
    const onOffline = () => {
      _state = { ..._state, isOnline: false };
      notify();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      _listeners = _listeners.filter((fn) => fn !== setState);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return state;
}
