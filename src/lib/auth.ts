// ===== Google Sign-In + Access Control =====
// Uses Google Identity Services (GIS). Konfigurasi di src/lib/config.ts
import { GOOGLE_CLIENT_ID, ROOT_ADMIN_EMAIL, isGoogleConfigured } from "./config";
export { GOOGLE_CLIENT_ID, ROOT_ADMIN_EMAIL, isGoogleConfigured };

export type Role = "admin" | "editor" | "viewer";

export interface AccessEntry {
  email: string;
  role: Role;
  addedAt: number;
  addedBy?: string;
}

export interface CurrentUser {
  email: string;
  name: string;
  picture?: string;
  role: Role;
}

const SESSION_USER_KEY = "glassdeploy_user";
const REMEMBER_USER_KEY = "glassdeploy_user_remember";

// ---- JWT decode (client-side, for reading email/name from Google id_token) ----
export function decodeJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---- Current user (persisted in storage) ----
export function getCurrentUser(): CurrentUser | null {
  try {
    const raw =
      sessionStorage.getItem(SESSION_USER_KEY) ||
      localStorage.getItem(REMEMBER_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser, remember: boolean) {
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  if (remember) localStorage.setItem(REMEMBER_USER_KEY, JSON.stringify(user));
}

export function logout() {
  sessionStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(REMEMBER_USER_KEY);
  // Also disable Google auto-select for next visit
  try {
    (window as any).google?.accounts?.id?.disableAutoSelect?.();
  } catch {}
}

export function isAdmin(user: CurrentUser | null): boolean {
  if (!user) return false;
  return user.email.toLowerCase() === ROOT_ADMIN_EMAIL || user.role === "admin";
}

// ===== Access list (allowlist) =====
// Stored in Firestore collection "access" (doc id = lowercased email)
// Fallback: localStorage
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { getDb } from "./firebase";

const LS_ACCESS_KEY = "glassdeploy_access";

function readLocalAccess(): Record<string, AccessEntry> {
  try {
    return JSON.parse(localStorage.getItem(LS_ACCESS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeLocalAccess(d: Record<string, AccessEntry>) {
  localStorage.setItem(LS_ACCESS_KEY, JSON.stringify(d));
}

export async function listAccess(): Promise<AccessEntry[]> {
  const db = getDb();
  const out: AccessEntry[] = [];
  // Always include the root admin
  out.push({
    email: ROOT_ADMIN_EMAIL,
    role: "admin",
    addedAt: 0,
    addedBy: "system",
  });

  if (db) {
    try {
      const snap = await getDocs(collection(db, "access"));
      snap.forEach((d) => {
        const data = d.data() as AccessEntry;
        if (data.email.toLowerCase() !== ROOT_ADMIN_EMAIL) {
          out.push(data);
        }
      });
      return out.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    } catch (e) {
      console.error("listAccess firestore error", e);
    }
  }
  const local = readLocalAccess();
  Object.values(local).forEach((v) => {
    if (v.email.toLowerCase() !== ROOT_ADMIN_EMAIL) out.push(v);
  });
  return out.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
}

export async function addAccess(
  email: string,
  role: Role,
  addedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const norm = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    return { ok: false, error: "Format email tidak valid." };
  }
  if (norm === ROOT_ADMIN_EMAIL) {
    return { ok: false, error: "Email ini adalah admin utama (tidak perlu ditambahkan)." };
  }
  const entry: AccessEntry = { email: norm, role, addedAt: Date.now(), addedBy };

  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, "access", norm), entry);
      return { ok: true };
    } catch (e) {
      console.error("addAccess firestore error", e);
    }
  }
  const local = readLocalAccess();
  local[norm] = entry;
  writeLocalAccess(local);
  return { ok: true };
}

export async function removeAccess(email: string): Promise<void> {
  const norm = email.trim().toLowerCase();
  if (norm === ROOT_ADMIN_EMAIL) return; // never remove root admin
  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "access", norm));
      return;
    } catch (e) {
      console.error("removeAccess firestore error", e);
    }
  }
  const local = readLocalAccess();
  delete local[norm];
  writeLocalAccess(local);
}

export async function updateRole(email: string, role: Role): Promise<void> {
  const norm = email.trim().toLowerCase();
  if (norm === ROOT_ADMIN_EMAIL) return; // root is always admin
  const db = getDb();
  if (db) {
    try {
      const ref = doc(db, "access", norm);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(ref, { ...(snap.data() as AccessEntry), role });
        return;
      }
    } catch (e) {
      console.error("updateRole firestore error", e);
    }
  }
  const local = readLocalAccess();
  if (local[norm]) {
    local[norm].role = role;
    writeLocalAccess(local);
  }
}

export async function resolveRole(email: string): Promise<Role | null> {
  const norm = email.trim().toLowerCase();
  if (norm === ROOT_ADMIN_EMAIL) return "admin";

  const db = getDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, "access", norm));
      if (snap.exists()) {
        return (snap.data() as AccessEntry).role || "viewer";
      }
      return null;
    } catch (e) {
      console.error("resolveRole firestore error", e);
    }
  }
  const local = readLocalAccess();
  return local[norm]?.role || null;
}
