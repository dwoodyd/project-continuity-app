export type OfflineCaptureDraft = {
  id: string;
  mode: "text" | "voice";
  transcript?: string;
  audioBlob?: Blob;
  mimeType?: string;
  durationS?: number;
  createdAt: number;
};

const DB_NAME = "continuary-offline-captures";
const STORE_NAME = "queue";

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineCapture(draft: Omit<OfflineCaptureDraft, "id" | "createdAt">): Promise<void> {
  const database = await openQueue();
  const item: OfflineCaptureDraft = { ...draft, id: crypto.randomUUID(), createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getOfflineCaptureQueue(): Promise<OfflineCaptureDraft[]> {
  const database = await openQueue();
  const items = await new Promise<OfflineCaptureDraft[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as OfflineCaptureDraft[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error);
  });
  database.close();
  return items;
}

export async function removeOfflineCapture(id: string): Promise<void> {
  const database = await openQueue();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
