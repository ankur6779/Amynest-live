import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";

export type LibrarySort = "updated" | "title" | "topic";
export type LibraryFilter = "all" | "favorites" | "recent" | "archived" | "trash";

/** DOM-free library entry shape — safe for Node / API server imports. */
export interface LibraryEntry {
  id: string;
  documentId: string;
  title: string;
  topic: string;
  tags: string[];
  folder: string;
  collection?: string;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  document: WorksheetDocument;
  updatedAt: string;
  createdAt: string;
}

export interface SavedTeacherTemplate {
  id: string;
  name: string;
  category: string;
  favorite: boolean;
  version: number;
  request: WorksheetGenerateRequest;
  sourceDocumentId?: string;
  useCount: number;
  updatedAt: string;
  createdAt: string;
}
