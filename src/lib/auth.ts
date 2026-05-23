// Simple client-side login gate using a secret access code.
const ACCESS_CODE = "SMARTGADGET12345YTTA2013";
const AUTH_KEY = "glassdeploy_auth";
const AUTH_VALUE = "ok_v1";

export function isLoggedIn(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === AUTH_VALUE ||
           localStorage.getItem(AUTH_KEY) === AUTH_VALUE;
  } catch {
    return false;
  }
}

export function tryLogin(code: string, remember: boolean): boolean {
  if (code.trim() === ACCESS_CODE) {
    if (remember) localStorage.setItem(AUTH_KEY, AUTH_VALUE);
    else sessionStorage.setItem(AUTH_KEY, AUTH_VALUE);
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
}
