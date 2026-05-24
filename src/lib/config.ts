// ============================================================
//  GLASSDEPLOY — KONFIGURASI PRIBADI
//  File ini berisi semua kredensial. JANGAN tampilkan di UI.
// ============================================================

// --- Firebase Web App config (Realtime Database) ---
// Dari: Project Settings → General → Your apps → Web app
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3IrREql-1PG1DhZQZklptxITQz_wOHZM",
  authDomain: "lunan-b6bfe.firebaseapp.com",
  databaseURL: "https://lunan-b6bfe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lunan-b6bfe",
  storageBucket: "lunan-b6bfe.firebasestorage.app",
  messagingSenderId: "705568398185",
  appId: "1:705568398185:web:b4cc60ac49a5e718277bf8",
};

export function isFirebaseConfigured(): boolean {
  return (
    !!FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.includes("REPLACE") &&
    !!FIREBASE_CONFIG.databaseURL
  );
}
