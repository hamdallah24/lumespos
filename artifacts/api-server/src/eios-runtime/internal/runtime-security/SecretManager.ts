import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

interface SecretEntry {
  value: string;
  created: string;
  rotationDue: string;
}

const STORE = new Map<string, SecretEntry>();
const ACCESS_LOG: string[] = [];

export const SecretManager = {
  set(key: string, value: string, ttlMs = 86400000): void {
    const now = Date.now();
    STORE.set(key, {
      value,
      created: new Date(now).toISOString(),
      rotationDue: new Date(now + ttlMs).toISOString(),
    });
  },

  get(key: string): string | null {
    const entry = STORE.get(key);
    if (!entry) return null;
    if (Date.now() > new Date(entry.rotationDue).getTime()) {
      STORE.delete(key);
      RuntimeLogger.warn("SecretManager", `Secret "${key}" expired and was removed`);
      return null;
    }
    ACCESS_LOG.push(`${new Date().toISOString()} GET ${key}`);
    return entry.value;
  },

  rotate(key: string, newValue: string, ttlMs = 86400000): void { this.set(key, newValue, ttlMs); },

  revoke(key: string): void { STORE.delete(key); },

  getAccessLog(): ReadonlyArray<string> { return ACCESS_LOG; },

  clear(): void { STORE.clear(); },
};
