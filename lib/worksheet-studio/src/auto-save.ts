import type { WorksheetDocument } from "./types.js";
import {
  AUTO_SAVE_INTERVAL_MS,
  DRAFT_DB_NAME,
  DRAFT_DB_VERSION,
  DRAFT_STORE_NAME,
  LIBRARY_STORE_NAME,
  TEMPLATES_STORE_NAME,
  VERSION_STORE_NAME,
} from "./constants.js";
import type { WorksheetDraftRecord } from "./types.js";
import {
  WORKSHEET_GENERATOR_VERSION,
  WORKSHEET_LAYOUT_VERSION,
  WORKSHEET_SCHEMA_VERSION,
} from "./live-pipeline-audit.js";

const MAX_VERSIONS_PER_DOC = 20;

export interface WorksheetDraftVersion {
  id: string;
  documentId: string;
  document: WorksheetDocument;
  savedAt: string;
  label: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(VERSION_STORE_NAME)) {
        const store = db.createObjectStore(VERSION_STORE_NAME, { keyPath: "id" });
        store.createIndex("documentId", "documentId", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(LIBRARY_STORE_NAME)) {
        const ls = db.createObjectStore(LIBRARY_STORE_NAME, { keyPath: "id" });
        ls.createIndex("updatedAt", "updatedAt", { unique: false });
        ls.createIndex("favorite", "favorite", { unique: false });
        ls.createIndex("folder", "folder", { unique: false });
      }
      if (!db.objectStoreNames.contains(TEMPLATES_STORE_NAME)) {
        const ts = db.createObjectStore(TEMPLATES_STORE_NAME, { keyPath: "id" });
        ts.createIndex("useCount", "useCount", { unique: false });
        ts.createIndex("favorite", "favorite", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(document: WorksheetDocument): Promise<void> {
  const db = await openDb();
  const record: WorksheetDraftRecord = {
    id: document.id,
    document: { ...document, meta: { ...document.meta, updatedAt: new Date().toISOString() } },
    savedAt: new Date().toISOString(),
    schemaVersion: WORKSHEET_SCHEMA_VERSION,
    layoutVersion: WORKSHEET_LAYOUT_VERSION,
    generatorVersion: WORKSHEET_GENERATOR_VERSION,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readwrite");
    tx.objectStore(DRAFT_STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDraftVersion(
  document: WorksheetDocument,
  label = "Auto-save",
): Promise<WorksheetDraftVersion> {
  const db = await openDb();
  const version: WorksheetDraftVersion = {
    id: `ver_${document.id}_${Date.now()}`,
    documentId: document.id,
    document: structuredClone(document),
    savedAt: new Date().toISOString(),
    label,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VERSION_STORE_NAME, "readwrite");
    tx.objectStore(VERSION_STORE_NAME).put(version);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await pruneOldVersions(document.id);
  await saveDraft(document);
  return version;
}

async function pruneOldVersions(documentId: string): Promise<void> {
  const versions = await listVersions(documentId);
  if (versions.length <= MAX_VERSIONS_PER_DOC) return;
  const toDelete = versions.slice(MAX_VERSIONS_PER_DOC);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VERSION_STORE_NAME, "readwrite");
    const store = tx.objectStore(VERSION_STORE_NAME);
    toDelete.forEach((v) => store.delete(v.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listVersions(documentId: string): Promise<WorksheetDraftVersion[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VERSION_STORE_NAME, "readonly");
    const idx = tx.objectStore(VERSION_STORE_NAME).index("documentId");
    const req = idx.getAll(documentId);
    req.onsuccess = () => {
      const rows = (req.result as WorksheetDraftVersion[]) ?? [];
      rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadDraft(id: string): Promise<WorksheetDraftRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readonly");
    const req = tx.objectStore(DRAFT_STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as WorksheetDraftRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function loadLatestDraft(): Promise<WorksheetDraftRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readonly");
    const req = tx.objectStore(DRAFT_STORE_NAME).getAll();
    req.onsuccess = () => {
      const rows = (req.result as WorksheetDraftRecord[]) ?? [];
      if (rows.length === 0) return resolve(null);
      rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      resolve(rows[0] ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listDrafts(): Promise<WorksheetDraftRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readonly");
    const req = tx.objectStore(DRAFT_STORE_NAME).getAll();
    req.onsuccess = () => {
      const rows = (req.result as WorksheetDraftRecord[]) ?? [];
      rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readwrite");
    tx.objectStore(DRAFT_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export { AUTO_SAVE_INTERVAL_MS };
