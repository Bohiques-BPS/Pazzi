
const DB_NAME = 'PazziPOS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

// Helper to handle IndexedDB operations
export const db = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject("IndexedDB not supported");
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  get: async <T>(key: string): Promise<T | null> => {
    try {
      const database = await db.open();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("DB Read Error", e);
      return null;
    }
  },

  set: async (key: string, value: any): Promise<void> => {
    try {
      const database = await db.open();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("DB Write Error", e);
    }
  },

  // Helper to migrate from localStorage if DB is empty
  migrateFromLocalStorage: async (key: string, fallbackValue: any) => {
    const dbValue = await db.get(key);
    if (dbValue !== null) {
      return dbValue;
    }
    
    // Try localStorage
    const localValue = localStorage.getItem(key);
    if (localValue) {
      try {
        const parsed = JSON.parse(localValue);
        await db.set(key, parsed); // Save to DB for next time
        return parsed;
      } catch (e) {
        console.warn(`Error parsing localStorage for ${key}`, e);
      }
    }
    
    return fallbackValue;
  }
};
