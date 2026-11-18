import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_REMINDERS,
  type PtmSession,
} from "@workspace/ptm-prep";
import {
  STORAGE_KEY_CLIENT_UPDATED_AT,
  clearAllPtmPrepStorage,
  loadPtmPrepLocal,
  ptmStorageKey,
  writePtmPrepLocal,
} from "@/lib/ptm-prep-storage";
import { clearUserSessionCaches } from "@/lib/user-session-cache";

function sampleDraft(name: string): PtmSession {
  return {
    id: `s_${name}`,
    childName: name,
    date: "2026-09-07",
    stage: "prepare",
    questions: [
      {
        id: "q1",
        text: "How is reading?",
        selected: true,
        asked: false,
        category: "academic",
        response: "",
      },
    ],
    notes: { teacherFeedback: "", weakAreas: "", suggestions: "" },
    actions: [],
    createdAt: 1,
  };
}

describe("ptm-prep-storage user scoping", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps User A and User B drafts in separate buckets", () => {
    writePtmPrepLocal("uid-a", {
      draft: sampleDraft("Aria"),
      history: [],
      reminders: [],
      clientUpdatedAt: 100,
    });
    writePtmPrepLocal("uid-b", {
      draft: sampleDraft("Bea"),
      history: [],
      reminders: [],
      clientUpdatedAt: 50,
    });

    expect(loadPtmPrepLocal("uid-a").draft?.childName).toBe("Aria");
    expect(loadPtmPrepLocal("uid-b").draft?.childName).toBe("Bea");
    expect(loadPtmPrepLocal("uid-a").clientUpdatedAt).toBe(100);
    expect(loadPtmPrepLocal("uid-b").clientUpdatedAt).toBe(50);
  });

  it("migrates legacy unscoped keys only when session uid matches active user", () => {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(sampleDraft("Legacy")));
    localStorage.setItem(STORAGE_KEY_HISTORY, "[]");
    localStorage.setItem(STORAGE_KEY_REMINDERS, "[]");
    localStorage.setItem(STORAGE_KEY_CLIENT_UPDATED_AT, "999");
    localStorage.setItem("amynest:session:uid:v1", "uid-new");

    const loaded = loadPtmPrepLocal("uid-new");
    expect(loaded.draft?.childName).toBe("Legacy");
    expect(loaded.clientUpdatedAt).toBe(999);
    expect(localStorage.getItem(STORAGE_KEY_DRAFT)).toBeNull();
    expect(localStorage.getItem(ptmStorageKey(STORAGE_KEY_DRAFT, "uid-new"))).toBeTruthy();

    expect(loadPtmPrepLocal("uid-other").draft).toBeNull();
    expect(loadPtmPrepLocal("uid-other").clientUpdatedAt).toBe(0);
  });

  it("discards legacy unscoped keys when session uid does not match", () => {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(sampleDraft("Leak")));
    localStorage.setItem(STORAGE_KEY_CLIENT_UPDATED_AT, "999");
    localStorage.setItem("amynest:session:uid:v1", "uid-a");

    const loaded = loadPtmPrepLocal("uid-b");
    expect(loaded.draft).toBeNull();
    expect(loaded.clientUpdatedAt).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY_DRAFT)).toBeNull();
  });

  it("account-switch clear wipes legacy and scoped PTM keys so LWW cannot push cross-user", () => {
    writePtmPrepLocal("uid-a", {
      draft: sampleDraft("Aria"),
      history: [sampleDraft("Old")],
      reminders: [],
      clientUpdatedAt: 1_700_000_000_000,
    });
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(sampleDraft("Leak")));
    localStorage.setItem(STORAGE_KEY_CLIENT_UPDATED_AT, "1700000000001");

    clearUserSessionCaches();

    expect(localStorage.getItem(STORAGE_KEY_DRAFT)).toBeNull();
    expect(localStorage.getItem(ptmStorageKey(STORAGE_KEY_DRAFT, "uid-a"))).toBeNull();
    expect(localStorage.getItem(ptmStorageKey(STORAGE_KEY_CLIENT_UPDATED_AT, "uid-a"))).toBeNull();
    expect(loadPtmPrepLocal("uid-b").draft).toBeNull();
    expect(loadPtmPrepLocal("uid-b").clientUpdatedAt).toBe(0);
  });

  it("clearAllPtmPrepStorage removes every amynest.ptm_prep.* key", () => {
    writePtmPrepLocal("uid-a", {
      draft: sampleDraft("Aria"),
      history: [],
      reminders: [],
      clientUpdatedAt: 1,
    });
    clearAllPtmPrepStorage();
    expect(
      [...Array(localStorage.length)].map((_, i) => localStorage.key(i)).filter(Boolean),
    ).toEqual([]);
  });
});
