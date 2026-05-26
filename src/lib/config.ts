// ============================================================
//  GLASSDEPLOY — KONFIGURASI PRIBADI
//  File ini berisi semua kredensial. JANGAN tampilkan di UI.
// ============================================================

// --- Firebase Web App config (Realtime Database) ---
// Dari: Project Settings → General → Your apps → Web app
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDjtjN29yc03BeAOeAvEsqQX23JuIMhLQg",
‎    authDomain: "deploy2-ed9ce.firebaseapp.com",
‎    databaseURL: "https://deploy2-ed9ce-default-rtdb.asia-southeast1.firebasedatabase.app",
‎    projectId: "deploy2-ed9ce",
‎    storageBucket: "deploy2-ed9ce.firebasestorage.app",
‎    messagingSenderId: "405598518951",
‎    appId: "1:405598518951:web:e20cc22b8aead19306e582",
};

export function isFirebaseConfigured(): boolean {
  return (
    !!FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.includes("REPLACE") &&
    !!FIREBASE_CONFIG.databaseURL
  );
}
