import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  update,
  push,
  query as rtdbQuery,
  orderByChild,
  type Database,
} from "firebase/database";

import { FIREBASE_CONFIG, isFirebaseConfigured } from "./config";

function isConfigValid(): boolean {
  return isFirebaseConfigured();
}

let app: FirebaseApp | null = null;
let db: Database | null = null;

export function getDb(): Database | null {
  if (!isConfigValid()) return null;
  try {
    if (!app) {
      app = initializeApp(FIREBASE_CONFIG);
      db = getDatabase(app);
    }
    return db;
  } catch (e) {
    console.error("Firebase init failed:", e);
    return null;
  }
}

export function getStorageMode(): "firebase" | "local" {
  return isConfigValid() ? "firebase" : "local";
}

// ===== Page type =====
export interface Page {
  id: string;
  title: string;
  html: string;
  createdAt: number;
  updatedAt: number;
  views: number;
  uniqueVisitors: number;
  visitLog?: { ts: number; ua?: string }[];
}

// ===== Storage abstraction =====
const LS_PAGES_KEY = "glassdeploy_pages";
const LS_VISITOR_KEY = "glassdeploy_visitor_id";

function getVisitorId(): string {
  let id = localStorage.getItem(LS_VISITOR_KEY);
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_VISITOR_KEY, id);
  }
  return id;
}

function readLocalPages(): Record<string, Page> {
  try {
    return JSON.parse(localStorage.getItem(LS_PAGES_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeLocalPages(pages: Record<string, Page>) {
  localStorage.setItem(LS_PAGES_KEY, JSON.stringify(pages));
}

// ----- Pages -----
export async function listPages(): Promise<Page[]> {
  const database = getDb();
  if (database) {
    try {
      const snap = await get(ref(database, "pages"));
      if (snap.exists()) {
        const val = snap.val() as Record<string, Page>;
        return Object.values(val).sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [];
    } catch (e) {
      console.error("listPages RTDB error", e);
    }
  }
  const local = readLocalPages();
  return Object.values(local).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPage(id: string): Promise<Page | null> {
  const database = getDb();
  if (database) {
    try {
      const snap = await get(ref(database, `pages/${id}`));
      if (snap.exists()) return snap.val() as Page;
      return null;
    } catch (e) {
      console.error("getPage RTDB error", e);
    }
  }
  const local = readLocalPages();
  return local[id] || null;
}

export async function savePage(page: Page): Promise<void> {
  const database = getDb();
  if (database) {
    try {
      await set(ref(database, `pages/${page.id}`), {
        ...page,
        updatedAt: Date.now(),
      });
      return;
    } catch (e) {
      console.error("savePage RTDB error", e);
    }
  }
  const local = readLocalPages();
  local[page.id] = { ...page, updatedAt: Date.now() };
  writeLocalPages(local);
}

export async function deletePage(id: string): Promise<void> {
  const database = getDb();
  if (database) {
    try {
      await remove(ref(database, `pages/${id}`));
      return;
    } catch (e) {
      console.error("deletePage RTDB error", e);
    }
  }
  const local = readLocalPages();
  delete local[id];
  writeLocalPages(local);
}

// ----- Visit tracking -----
export async function recordVisit(id: string): Promise<void> {
  const visitorId = getVisitorId();
  const visitedKey = `visited_${id}_${visitorId}`;
  const alreadyVisited = !!localStorage.getItem(visitedKey);

  const database = getDb();
  if (database) {
    try {
      const pageRef = ref(database, `pages/${id}`);
      const snap = await get(pageRef);
      if (snap.exists()) {
        const page = snap.val() as Page;
        const updates: Partial<Page> = {
          views: (page.views || 0) + 1,
        };
        if (!alreadyVisited) {
          updates.uniqueVisitors = (page.uniqueVisitors || 0) + 1;
        }
        await update(pageRef, updates);

        try {
          const visitKey = `${Date.now()}_${visitorId.slice(0, 6)}`;
          await set(ref(database, `pageVisits/${id}/${visitKey}`), {
            ts: Date.now(),
            ua: navigator.userAgent.slice(0, 200),
            visitor: visitorId,
          });
        } catch {}

        localStorage.setItem(visitedKey, "1");
      }
      return;
    } catch (e) {
      console.error("recordVisit RTDB error", e);
    }
  }

  const local = readLocalPages();
  const page = local[id];
  if (page) {
    page.views = (page.views || 0) + 1;
    if (!alreadyVisited) page.uniqueVisitors = (page.uniqueVisitors || 0) + 1;
    page.visitLog = page.visitLog || [];
    page.visitLog.unshift({ ts: Date.now(), ua: navigator.userAgent.slice(0, 100) });
    page.visitLog = page.visitLog.slice(0, 100);
    local[id] = page;
    writeLocalPages(local);
    localStorage.setItem(visitedKey, "1");
  }
}

export async function getVisitLog(id: string): Promise<{ ts: number; ua?: string }[]> {
  const database = getDb();
  if (database) {
    try {
      const snap = await get(ref(database, `pageVisits/${id}`));
      if (snap.exists()) {
        const val = snap.val() as Record<string, { ts: number; ua?: string }>;
        return Object.values(val).sort((a, b) => b.ts - a.ts);
      }
      return [];
    } catch (e) {
      console.error("getVisitLog RTDB error", e);
    }
  }
  const local = readLocalPages();
  return local[id]?.visitLog || [];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
