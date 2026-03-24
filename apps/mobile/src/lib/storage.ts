import * as SecureStore from "expo-secure-store";

export const mmkv = {
  getString: (key: string): string | undefined => {
    try {
      return SecureStore.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (key: string, value: string | number | boolean) => {
    try {
      SecureStore.setItem(key, String(value));
    } catch {}
  },
  getBoolean: (key: string): boolean | undefined => {
    try {
      const v = SecureStore.getItem(key);
      if (v === null || v === undefined) return undefined;
      return v === "true";
    } catch {
      return undefined;
    }
  },
  delete: (key: string) => {
    try {
      SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

export function createSupabaseStorageAdapter(storage: typeof mmkv) {
  return {
    getItem: (key: string): string | null => {
      return storage.getString(key) ?? null;
    },
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
    removeItem: (key: string): void => {
      storage.delete(key);
    },
  };
}
