import type { WorksheetDocument } from "./types.js";
import { DRAFT_DB_NAME } from "./constants.js";
import { duplicateWorksheetDocument } from "./teacher-productivity.js";
import type { LibraryEntry, LibraryFilter, LibrarySort, SavedTeacherTemplate } from "./library-types.js";

export type { LibraryEntry, LibraryFilter, LibrarySort, SavedTeacherTemplate } from "./library-types.js";

export const LIBRARY_STORE = "library";
export const TEMPLATES_STORE = "teacher_templates";
const DB_VERSION = 4;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("versions")) {
        const vs = db.createObjectStore("versions", { keyPath: "id" });
        vs.createIndex("documentId", "documentId", { unique: false });
      }
      if (!db.objectStoreNames.contains(LIBRARY_STORE)) {
        const ls = db.createObjectStore(LIBRARY_STORE, { keyPath: "id" });
        ls.createIndex("updatedAt", "updatedAt", { unique: false });
        ls.createIndex("favorite", "favorite", { unique: false });
        ls.createIndex("folder", "folder", { unique: false });
      }
      if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
        const ts = db.createObjectStore(TEMPLATES_STORE, { keyPath: "id" });
        ts.createIndex("useCount", "useCount", { unique: false });
        ts.createIndex("favorite", "favorite", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function txPut<T>(store: string, value: T): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    t.objectStore(store).put(value);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function txGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readonly");
    const req = t.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function txDelete(store: string, id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    t.objectStore(store).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function saveToLibrary(
  doc: WorksheetDocument,
  opts?: Partial<Pick<LibraryEntry, "folder" | "tags" | "favorite" | "collection" | "title">>,
): Promise<LibraryEntry> {
  const existing = (await txGetAll<LibraryEntry>(LIBRARY_STORE)).find((e) => e.documentId === doc.id);
  const now = new Date().toISOString();
  const entry: LibraryEntry = {
    id: existing?.id ?? doc.id,
    documentId: doc.id,
    title: opts?.title ?? doc.meta.title,
    topic: doc.meta.topic,
    tags: opts?.tags ?? existing?.tags ?? [],
    folder: opts?.folder ?? existing?.folder ?? "My Worksheets",
    collection: opts?.collection ?? existing?.collection,
    favorite: opts?.favorite ?? existing?.favorite ?? false,
    archived: existing?.archived ?? false,
    trashed: false,
    document: structuredClone(doc),
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  };
  await txPut(LIBRARY_STORE, entry);
  return entry;
}

export async function getLibraryEntry(id: string): Promise<LibraryEntry | null> {
  const all = await txGetAll<LibraryEntry>(LIBRARY_STORE);
  return all.find((e) => e.id === id) ?? null;
}

export async function listLibrary(opts?: {
  filter?: LibraryFilter;
  folder?: string;
  sort?: LibrarySort;
}): Promise<LibraryEntry[]> {
  let rows = await txGetAll<LibraryEntry>(LIBRARY_STORE);
  const filter = opts?.filter ?? "all";

  if (filter === "trash") rows = rows.filter((r) => r.trashed);
  else if (filter === "archived") rows = rows.filter((r) => r.archived && !r.trashed);
  else if (filter === "favorites") rows = rows.filter((r) => r.favorite && !r.trashed && !r.archived);
  else if (filter === "recent") rows = rows.filter((r) => !r.trashed && !r.archived).slice(0, 12);
  else rows = rows.filter((r) => !r.trashed && !r.archived);

  if (opts?.folder) rows = rows.filter((r) => r.folder === opts.folder);

  const sort = opts?.sort ?? "updated";
  if (sort === "title") rows.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "topic") rows.sort((a, b) => a.topic.localeCompare(b.topic));
  else rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return rows;
}

export async function searchLibrary(query: string): Promise<LibraryEntry[]> {
  const q = query.toLowerCase().trim();
  if (!q) return listLibrary();
  const all = await listLibrary();
  return all.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.topic.toLowerCase().includes(q) ||
      e.folder.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

export async function listFolders(): Promise<string[]> {
  const all = await listLibrary();
  return [...new Set(all.map((e) => e.folder))].sort();
}

export async function updateLibraryEntry(
  id: string,
  patch: Partial<Pick<LibraryEntry, "title" | "folder" | "tags" | "favorite" | "archived" | "trashed" | "collection">>,
): Promise<LibraryEntry | null> {
  const all = await txGetAll<LibraryEntry>(LIBRARY_STORE);
  const entry = all.find((e) => e.id === id);
  if (!entry) return null;
  const updated = { ...entry, ...patch, updatedAt: new Date().toISOString() };
  await txPut(LIBRARY_STORE, updated);
  return updated;
}

export async function renameLibraryEntry(id: string, title: string): Promise<LibraryEntry | null> {
  const entry = await updateLibraryEntry(id, { title });
  if (entry) {
    entry.document.meta.title = title;
    await txPut(LIBRARY_STORE, entry);
  }
  return entry;
}

export async function duplicateLibraryEntry(id: string): Promise<LibraryEntry | null> {
  const entry = await getLibraryEntry(id);
  if (!entry) return null;
  const copy = duplicateWorksheetDocument(entry.document);
  return saveToLibrary(copy, { folder: entry.folder, tags: entry.tags });
}

export async function toggleFavorite(id: string): Promise<LibraryEntry | null> {
  const entry = await getLibraryEntry(id);
  if (!entry) return null;
  return updateLibraryEntry(id, { favorite: !entry.favorite });
}

export async function moveToTrash(id: string): Promise<void> {
  await updateLibraryEntry(id, { trashed: true });
}

export async function restoreFromTrash(id: string): Promise<void> {
  await updateLibraryEntry(id, { trashed: false });
}

export async function archiveEntry(id: string): Promise<void> {
  await updateLibraryEntry(id, { archived: true });
}

export async function bulkDeleteLibrary(ids: string[], permanent = false): Promise<number> {
  let count = 0;
  for (const id of ids) {
    if (permanent) {
      await txDelete(LIBRARY_STORE, id);
    } else {
      await moveToTrash(id);
    }
    count += 1;
  }
  return count;
}

export async function saveAsTemplate(
  doc: WorksheetDocument,
  name: string,
  category = "custom",
): Promise<SavedTeacherTemplate> {
  const tpl: SavedTeacherTemplate = {
    id: `tpl_${Date.now()}`,
    name,
    category,
    favorite: false,
    version: 1,
    request: {
      prompt: doc.prompt,
      classLevel: doc.meta.classLevel,
      subject: doc.meta.subject,
      difficulty: doc.meta.difficulty,
      pageCount: doc.meta.pageCount,
    },
    sourceDocumentId: doc.id,
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await txPut(TEMPLATES_STORE, tpl);
  return tpl;
}

export async function listSavedTemplates(): Promise<SavedTeacherTemplate[]> {
  const rows = await txGetAll<SavedTeacherTemplate>(TEMPLATES_STORE);
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function recordTemplateUse(id: string): Promise<void> {
  const rows = await txGetAll<SavedTeacherTemplate>(TEMPLATES_STORE);
  const tpl = rows.find((t) => t.id === id);
  if (!tpl) return;
  tpl.useCount += 1;
  tpl.updatedAt = new Date().toISOString();
  await txPut(TEMPLATES_STORE, tpl);
}

export async function toggleTemplateFavorite(id: string): Promise<void> {
  const rows = await txGetAll<SavedTeacherTemplate>(TEMPLATES_STORE);
  const tpl = rows.find((t) => t.id === id);
  if (!tpl) return;
  tpl.favorite = !tpl.favorite;
  await txPut(TEMPLATES_STORE, tpl);
}
