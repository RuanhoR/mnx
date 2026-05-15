const DB_NAME = 'mcx-page-cache'
const STORE_NAME = 'cache'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result)
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error)
  })
}

export class IDBCache {
  static async set<T = unknown>(key: string, value: T, expirationMinutes = 5): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ value: JSON.parse(JSON.stringify(value)), expiresAt: Date.now() + expirationMinutes * 60 * 1000 }, key)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  }

  static async get<T = unknown>(key: string): Promise<T | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => {
        db.close()
        const data = req.result
        if (!data) return resolve(null)
        if (Date.now() > data.expiresAt) {
          IDBCache.remove(key)
          return resolve(null)
        }
        resolve(data.value as T)
      }
      req.onerror = () => { db.close(); reject(req.error) }
    })
  }

  static async remove(key: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(key)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  }
}
