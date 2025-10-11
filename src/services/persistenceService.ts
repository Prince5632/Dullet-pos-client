// Simple localStorage-based persistence utilities with namespacing helpers
// Persist filters and pagination across sessions until manually cleared

type JsonValue = any;

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const safeGet = (key: string): string | null => {
  try {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    if (!isBrowser()) return;
    window.localStorage.setItem(key, value);
  } catch {}
};

const safeRemove = (key: string) => {
  try {
    if (!isBrowser()) return;
    window.localStorage.removeItem(key);
  } catch {}
};

const buildKey = (namespace: string, key: string) => `${namespace}.${key}`;

export const persistenceService = {
  // Raw JSON helpers
  getJSON<T = JsonValue>(key: string, defaultValue: T): T {
    const raw = safeGet(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },
  setJSON(key: string, value: JsonValue) {
    try {
      safeSet(key, JSON.stringify(value));
    } catch {}
  },
  remove(key: string) {
    safeRemove(key);
  },

  // Namespaced helpers
  getNS<T = JsonValue>(namespace: string, key: string, defaultValue: T): T {
    return this.getJSON<T>(buildKey(namespace, key), defaultValue);
  },
  setNS(namespace: string, key: string, value: JsonValue) {
    this.setJSON(buildKey(namespace, key), value);
  },
  removeNS(namespace: string, key: string) {
    this.remove(buildKey(namespace, key));
  },
  clearNamespace(namespace: string) {
    if (!isBrowser()) return;
    try {
      const prefix = `${namespace}.`;
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {}
  },
  namespaceHasData(namespace: string): boolean {
    if (!isBrowser()) return false;
    try {
      const prefix = `${namespace}.`;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};

export const PERSIST_NS = {
  ORDERS: "orders",
  VISITS: "visits",
  CUSTOMERS: "customers",
  SALES_EXEC_REPORTS: "sales_exec_reports",
  INVENTORY: "inventory",
  TRANSITS: "transits",
  USERS: "users",
  CUSTOMER_REPORTS: "customer_reports",
  ATTENDANCE: "attendance",
  DASHBOARD: "dashboard",
  ROLES: "roles",
  PRODUCTIONS: "productions",
  PROFILE: "profile",
};

// Clear all namespaces except the provided one(s)
export const clearOtherNamespaces = (preserve: string | string[]) => {
  const allNamespaces = Object.values(PERSIST_NS);
  const keep = new Set(Array.isArray(preserve) ? preserve : [preserve]);
  for (const ns of allNamespaces) {
    if (!keep.has(ns)) {
      try {
        persistenceService.clearNamespace(ns);
      } catch {}
    }
  }
};