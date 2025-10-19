/**
 * IndexedDB helper for offline-first data storage
 * Uses idb library for clean Promise-based API
 */

import { openDB } from 'idb';

const DB_NAME = 'jkuat-course-hub';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  COURSES: 'courses',
  MATERIALS: 'materials',
  USER_PROFILE: 'userProfile',
  LAST_SYNC: 'lastSync',
};

/**
 * Initialize IndexedDB with all required object stores
 */
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Courses store - indexed by course ID
      if (!db.objectStoreNames.contains(STORES.COURSES)) {
        const courseStore = db.createObjectStore(STORES.COURSES, {
          keyPath: 'id',
        });
        courseStore.createIndex('course_name', 'course_name');
        courseStore.createIndex('department', 'department');
      }

      // Materials store - indexed by material ID and course ID
      if (!db.objectStoreNames.contains(STORES.MATERIALS)) {
        const materialStore = db.createObjectStore(STORES.MATERIALS, {
          keyPath: 'id',
        });
        materialStore.createIndex('course_id', 'course_id');
        materialStore.createIndex('topic_id', 'topic_id');
        materialStore.createIndex('type', 'type');
      }

      // User profile store - single entry
      if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
        db.createObjectStore(STORES.USER_PROFILE, {
          keyPath: 'id',
        });
      }

      // Last sync timestamps - tracks when each store was last synced
      if (!db.objectStoreNames.contains(STORES.LAST_SYNC)) {
        db.createObjectStore(STORES.LAST_SYNC, {
          keyPath: 'store',
        });
      }
    },
  });
}

/**
 * Get all items from a store
 */
export async function getAllFromStore(storeName) {
  const db = await initDB();
  return db.getAll(storeName);
}

/**
 * Get a single item from a store by key
 */
export async function getFromStore(storeName, key) {
  const db = await initDB();
  return db.get(storeName, key);
}

/**
 * Add or update an item in a store
 */
export async function putInStore(storeName, value) {
  const db = await initDB();
  return db.put(storeName, value);
}

/**
 * Add or update multiple items in a store (bulk operation)
 */
export async function putManyInStore(storeName, values) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all([
    ...values.map(value => tx.store.put(value)),
    tx.done,
  ]);
}

/**
 * Delete an item from a store
 */
export async function deleteFromStore(storeName, key) {
  const db = await initDB();
  return db.delete(storeName, key);
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName) {
  const db = await initDB();
  return db.clear(storeName);
}

/**
 * Get items from a store by index
 */
export async function getByIndex(storeName, indexName, key) {
  const db = await initDB();
  return db.getAllFromIndex(storeName, indexName, key);
}

/**
 * Get last sync time for a store
 */
export async function getLastSyncTime(storeName) {
  const db = await initDB();
  const syncData = await db.get(STORES.LAST_SYNC, storeName);
  return syncData?.timestamp || null;
}

/**
 * Update last sync time for a store
 */
export async function updateLastSyncTime(storeName) {
  const db = await initDB();
  await db.put(STORES.LAST_SYNC, {
    store: storeName,
    timestamp: Date.now(),
  });
}

/**
 * Check if data in a store is stale (older than maxAge milliseconds)
 */
export async function isStale(storeName, maxAge = 60 * 60 * 1000) {
  const lastSync = await getLastSyncTime(storeName);
  if (!lastSync) return true; // Never synced = stale
  return Date.now() - lastSync > maxAge;
}

/**
 * Get storage quota information
 */
export async function getStorageInfo() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? (usage / quota) * 100 : 0;

  return {
    usage,
    quota,
    percentage,
    usageMB: (usage / (1024 * 1024)).toFixed(2),
    quotaMB: (quota / (1024 * 1024)).toFixed(2),
  };
}

/**
 * Clear all offline data
 */
export async function clearAllData() {
  const db = await initDB();
  const stores = [
    STORES.COURSES,
    STORES.MATERIALS,
    STORES.USER_PROFILE,
    STORES.LAST_SYNC,
  ];

  for (const store of stores) {
    await db.clear(store);
  }
}
