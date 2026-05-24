// ============================================================
//  GLASSDEPLOY — KONFIGURASI PRIBADI
//  File ini berisi semua kredensial. JANGAN tampilkan di UI.
// ============================================================

// --- Google OAuth Client ID (untuk Sign in with Google) ---
// Buat di: https://console.cloud.google.com/apis/credentials
// Pilih "OAuth client ID" → "Web application"
// Tambahkan domain Anda ke "Authorized JavaScript origins"
export const GOOGLE_CLIENT_ID =
  "859282974777-95cv1m130arf0lr8pblo52qobqlfd4m3.apps.googleusercontent.com";

// --- Email admin utama (TIDAK ditampilkan di UI) ---
export const ROOT_ADMIN_EMAIL = "azkakencil6@gmail.com";

// --- Firebase Web App config ---
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

// ============================================================
//  Tidak perlu mengubah apa pun di bawah ini.
// ============================================================

export function isGoogleConfigured(): boolean {
  return (
    !!GOOGLE_CLIENT_ID &&
    !GOOGLE_CLIENT_ID.includes("REPLACE") &&
    GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com")
  );
}

export function isFirebaseConfigured(): boolean {
  return (
    !!FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.includes("REPLACE") &&
    !!FIREBASE_CONFIG.projectId
  );
}
