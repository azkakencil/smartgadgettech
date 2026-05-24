import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

import { FIREBASE_CONFIG, isFirebaseConfigured } from "./config";

function isConfigValid(): boolean {
  return isFirebaseConfigured();
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getDb(): Firestore | null {
  if (!isConfigValid()) return null;
  try {
    if (!app) {
      app = initializeApp(FIREBASE_CONFIG);
      db = getFirestore(app);
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
      const snap = await getDocs(query(collection(database, "pages"), orderBy("updatedAt", "desc")));
      return snap.docs.map((d) => d.data() as Page);
    } catch (e) {
      console.error("listPages firestore error", e);
    }
  }
  const local = readLocalPages();
  return Object.values(local).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPage(id: string): Promise<Page | null> {
  const database = getDb();
  if (database) {
    try {
      const snap = await getDoc(doc(database, "pages", id));
      if (snap.exists()) return snap.data() as Page;
      return null;
    } catch (e) {
      console.error("getPage firestore error", e);
    }
  }
  const local = readLocalPages();
  return local[id] || null;
}

export async function savePage(page: Page): Promise<void> {
  const database = getDb();
  if (database) {
    try {
      await setDoc(doc(database, "pages", page.id), {
        ...page,
        updatedAt: Date.now(),
        _serverUpdatedAt: serverTimestamp(),
      });
      return;
    } catch (e) {
      console.error("savePage firestore error", e);
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
      await deleteDoc(doc(database, "pages", id));
      return;
    } catch (e) {
      console.error("deletePage firestore error", e);
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
      const ref = doc(database, "pages", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const updates: any = { views: increment(1) };
        if (!alreadyVisited) updates.uniqueVisitors = increment(1);
        await updateDoc(ref, updates);

        try {
          await setDoc(
            doc(database, "pages", id, "visits", String(Date.now()) + "_" + visitorId.slice(0, 6)),
            { ts: Date.now(), ua: navigator.userAgent.slice(0, 200), visitor: visitorId }
          );
        } catch {}

        localStorage.setItem(visitedKey, "1");
      }
      return;
    } catch (e) {
      console.error("recordVisit firestore error", e);
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
      const snap = await getDocs(
        query(collection(database, "pages", id, "visits"), orderBy("ts", "desc"))
      );
      return snap.docs.map((d) => d.data() as { ts: number; ua?: string });
    } catch (e) {
      console.error("getVisitLog firestore error", e);
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
