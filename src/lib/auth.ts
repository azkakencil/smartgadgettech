// ===== Multi-layer Auth (3 lapisan) =====
// Lapisan 1: Tanggal lahir (28-6-2013)
// Lapisan 2: Kode akses rahasia (SMARTGADGET12345)
// Lapisan 3: Nama rahasia (kholifadilmubarok)

// Tanggal lahir rahasia: 28 Juni 2013
export const SECRET_BIRTHDAY = { day: 28, month: 6, year: 2013 };
export const SECRET_CODE = "SMARTGADGET12345";
export const SECRET_NAME = "kholifadilmubarok";

export type Role = "admin";

export interface CurrentUser {
  name: string;
  role: Role;
  loggedInAt: number;
}

const SESSION_USER_KEY = "glassdeploy_user";
const REMEMBER_USER_KEY = "glassdeploy_user_remember";

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
}

export function isAdmin(_user: CurrentUser | null): boolean {
  // Semua user yang lulus 3 lapisan = admin
  return !!_user;
}

// ===== Verifikasi setiap lapisan =====

// Lapisan 1: Tanggal lahir
export function verifyBirthday(day: number, month: number, year: number): boolean {
  return (
    day === SECRET_BIRTHDAY.day &&
    month === SECRET_BIRTHDAY.month &&
    year === SECRET_BIRTHDAY.year
  );
}

// Lapisan 2: Kode rahasia (case-insensitive)
export function verifySecretCode(code: string): boolean {
  return code.trim().toUpperCase() === SECRET_CODE.toUpperCase();
}

// Lapisan 3: Nama rahasia (case-insensitive)
export function verifySecretName(name: string): boolean {
  return name.trim().toLowerCase() === SECRET_NAME.toLowerCase();
}
