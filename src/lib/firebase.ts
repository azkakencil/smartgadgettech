import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  type Database,
  ref,
  get,
  set,
  remove,
  update,
  runTransaction,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { FIREBASE_CONFIG, isFirebaseConfigured } from "./config";

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;

export function getRtdb(): Database | null {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!app) {
      app = initializeApp(FIREBASE_CONFIG);
      rtdb = getDatabase(app);
    }
    return rtdb;
  } catch (e) {
    console.error("Firebase init failed:", e);
    return null;
  }
}

export function getStorageMode(): "firebase" | "local" {
  return isFirebaseConfigured() ? "firebase" : "local";
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
}

export interface VisitEntry {
  ts: number;
  ua?: string;
}

// ===== Storage abstraction =====
const LS_PAGES_KEY = "glassdeploy_pages";
const LS_VISITS_KEY = "glassdeploy_visits";
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

function readLocalVisits(): Record<string, VisitEntry[]> {
  try {
    return JSON.parse(localStorage.getItem(LS_VISITS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeLocalVisits(v: Record<string, VisitEntry[]>) {
  localStorage.setItem(LS_VISITS_KEY, JSON.stringify(v));
}

// ----- Pages -----
export async function listPages(): Promise<Page[]> {
  const db = getRtdb();
  if (db) {
    try {
      const snap = await get(ref(db, "pages"));
      const val = snap.val() as Record<string, Page> | null;
      if (!val) return [];
      return Object.values(val).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (e) {
      console.error("listPages rtdb error", e);
    }
  }
  const local = readLocalPages();
  return Object.values(local).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPage(id: string): Promise<Page | null> {
  const db = getRtdb();
  if (db) {
    try {
      const snap = await get(ref(db, `pages/${id}`));
      if (snap.exists()) return snap.val() as Page;
      return null;
    } catch (e) {
      console.error("getPage rtdb error", e);
    }
  }
  const local = readLocalPages();
  return local[id] || null;
}

export async function savePage(page: Page): Promise<void> {
  const data = { ...page, updatedAt: Date.now() };
  const db = getRtdb();
  if (db) {
    try {
      await set(ref(db, `pages/${page.id}`), data);
      return;
    } catch (e) {
      console.error("savePage rtdb error", e);
    }
  }
  const local = readLocalPages();
  local[page.id] = data;
  writeLocalPages(local);
}

export async function deletePage(id: string): Promise<void> {
  const db = getRtdb();
  if (db) {
    try {
      await remove(ref(db, `pages/${id}`));
      await remove(ref(db, `visits/${id}`));
      return;
    } catch (e) {
      console.error("deletePage rtdb error", e);
    }
  }
  const local = readLocalPages();
  delete local[id];
  writeLocalPages(local);
  const v = readLocalVisits();
  delete v[id];
  writeLocalVisits(v);
}

// ----- Visit tracking -----
export async function recordVisit(id: string): Promise<void> {
  const visitorId = getVisitorId();
  const visitedKey = `visited_${id}_${visitorId}`;
  const alreadyVisited = !!localStorage.getItem(visitedKey);

  const db = getRtdb();
  if (db) {
    try {
      const pageRef = ref(db, `pages/${id}`);
      const snap = await get(pageRef);
      if (!snap.exists()) return;

      // Increment views atomically
      await runTransaction(ref(db, `pages/${id}/views`), (cur) => (cur || 0) + 1);
      if (!alreadyVisited) {
        await runTransaction(ref(db, `pages/${id}/uniqueVisitors`), (cur) => (cur || 0) + 1);
      }

      // Push visit log entry (keyed by timestamp to allow orderByChild)
      const visitId = `${Date.now()}_${visitorId.slice(0, 6)}`;
      await set(ref(db, `visits/${id}/${visitId}`), {
        ts: Date.now(),
        ua: navigator.userAgent.slice(0, 200),
        visitor: visitorId,
      });

      localStorage.setItem(visitedKey, "1");
      return;
    } catch (e) {
      console.error("recordVisit rtdb error", e);
    }
  }

  // Local fallback
  const local = readLocalPages();
  const page = local[id];
  if (page) {
    page.views = (page.views || 0) + 1;
    if (!alreadyVisited) page.uniqueVisitors = (page.uniqueVisitors || 0) + 1;
    local[id] = page;
    writeLocalPages(local);

    const visits = readLocalVisits();
    visits[id] = visits[id] || [];
    visits[id].unshift({ ts: Date.now(), ua: navigator.userAgent.slice(0, 100) });
    visits[id] = visits[id].slice(0, 100);
    writeLocalVisits(visits);

    localStorage.setItem(visitedKey, "1");
  }
}

export async function getVisitLog(id: string): Promise<VisitEntry[]> {
  const db = getRtdb();
  if (db) {
    try {
      const q = query(ref(db, `visits/${id}`), orderByChild("ts"), limitToLast(200));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const out: VisitEntry[] = [];
      snap.forEach((child) => {
        out.push(child.val() as VisitEntry);
        return undefined;
      });
      return out.sort((a, b) => b.ts - a.ts);
    } catch (e) {
      console.error("getVisitLog rtdb error", e);
    }
  }
  const local = readLocalVisits();
  return local[id] || [];
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

// Suppress unused warnings for things kept for compat
void update;
