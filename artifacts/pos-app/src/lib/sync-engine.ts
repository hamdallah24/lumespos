import {
  getPendingOrders,
  markOrderSynced,
  markOrderFailed,
  getPendingOrderCount,
  cleanupSyncedOrders,
} from "./offline-db";
import { setSyncStatus } from "../hooks/useOnlineStatus";
import { getCsrfToken } from "./csrf";

let _syncInterval: ReturnType<typeof setInterval> | null = null;
let _syncing = false;

async function flushQueue() {
  if (_syncing || !navigator.onLine) return;
  _syncing = true;
  setSyncStatus({ isSyncing: true });

  try {
    const pending = await getPendingOrders();
    if (pending.length === 0) {
      setSyncStatus({ queuedCount: 0, isSyncing: false });
      _syncing = false;
      return;
    }

    setSyncStatus({ queuedCount: pending.length });

    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }

    const response = await fetch("/api/orders/batch", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        orders: pending.map((o) => o.payload),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const results: Array<{ success: boolean; orderId?: number; error?: string }> =
      await response.json();

    for (let i = 0; i < pending.length; i++) {
      const result = results[i];
      if (result?.success) {
        await markOrderSynced(pending[i].id);
      } else {
        await markOrderFailed(
          pending[i].id,
          result?.error ?? "Sync failed"
        );
      }
    }

    const remaining = await getPendingOrderCount();
    setSyncStatus({ queuedCount: remaining, isSyncing: false });

    await cleanupSyncedOrders();
  } catch (err) {
    console.error("[Sync] Flush failed:", err);
    const remaining = await getPendingOrderCount();
    setSyncStatus({ queuedCount: remaining, isSyncing: false });
  } finally {
    _syncing = false;
  }
}

function onOnline() {
  console.log("[Sync] Back online, flushing queue...");
  setTimeout(flushQueue, 1000);
}

export function startSyncEngine() {
  window.addEventListener("online", onOnline);
  _syncInterval = setInterval(() => {
    if (navigator.onLine && !_syncing) {
      flushQueue();
    }
  }, 30000);

  getPendingOrderCount().then((count) => {
    setSyncStatus({ queuedCount: count });
    if (navigator.onLine && count > 0) {
      flushQueue();
    }
  });
}

export function stopSyncEngine() {
  window.removeEventListener("online", onOnline);
  if (_syncInterval) {
    clearInterval(_syncInterval);
    _syncInterval = null;
  }
}

export { flushQueue };
