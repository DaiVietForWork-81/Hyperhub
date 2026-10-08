/**
 * utils/outbox.ts
 * Kho đệm IndexedDB: khi Discord Bot offline, đề user nộp được lưu tạm
 * trong trình duyệt rồi tự động gửi lên server khi bot online trở lại.
 * Dung lượng mỗi file tối đa 25MB — IndexedDB chứa thoải mái hàng chục file.
 */

export interface OutboxItem {
  id: string;
  name: string;
  size: number;
  ext: string;
  blob: Blob;
  uploaderName: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const DB_NAME = 'hyperhub_outbox';
const STORE_NAME = 'pending_docs';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Trình duyệt không hỗ trợ lưu tạm offline.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Không mở được kho đệm.'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let request: IDBRequest<T>;
        try {
          request = run(store);
        } catch (e) {
          db.close();
          reject(e);
          return;
        }
        request.onsuccess = () => {
          const value = request.result;
          db.close();
          resolve(value);
        };
        request.onerror = () => {
          db.close();
          reject(request.error || new Error('Lỗi kho đệm.'));
        };
      })
  );
}

export async function savePendingDoc(
  file: File,
  uploaderName: string
): Promise<OutboxItem> {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const item: OutboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    size: file.size,
    ext,
    blob: file,
    uploaderName,
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx('readwrite', (store) => store.add(item));
  return item;
}

export async function listPendingDocs(): Promise<OutboxItem[]> {
  const items = await tx<OutboxItem[]>('readonly', (store) => store.getAll());
  return (items || []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingDoc(id: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(id));
}

export async function touchPendingDoc(id: string, patch: Partial<OutboxItem>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as OutboxItem | undefined;
      if (current) {
        store.put({ ...current, ...patch });
      }
      db.close();
      resolve();
    };
    getReq.onerror = () => {
      db.close();
      reject(getReq.error || new Error('Lỗi kho đệm.'));
    };
  });
}
