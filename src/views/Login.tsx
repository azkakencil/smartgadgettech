import { useEffect, useRef, useState } from "react";
import {
  GOOGLE_CLIENT_ID,
  isGoogleConfigured,
  resolveRole,
  setCurrentUser,
  type CurrentUser,
} from "../lib/auth";
import { useTheme } from "../lib/theme";
import { SunIcon, MoonIcon } from "../components/Icons";

// Load Google Identity Services script (only once)
function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.id) return resolve();
    const existing = document.getElementById("gsi-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load GSI")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.id = "gsi-script";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load GSI"));
    document.head.appendChild(s);
  });
}

// Google logo SVG (multicolor)
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function Login({ onSuccess }: { onSuccess: (user: CurrentUser) => void }) {
  const { theme, toggle } = useTheme();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [remember, setRemember] = useState(true);
  const [gsiReady, setGsiReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [configured] = useState(isGoogleConfigured());
  const tokenClientRef = useRef<any>(null);

  const rememberRef = useRef(remember);
  useEffect(() => {
    rememberRef.current = remember;
  }, [remember]);

  // === Init Google Identity Services (OAuth token client only) ===
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled) return;
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
          setError("Google Identity Services tidak tersedia.");
          return;
        }

        try {
          tokenClientRef.current = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: "openid email profile",
            callback: handleTokenResponse,
            error_callback: (err: any) => {
              console.error("OAuth error:", err);
              setBusy(false);
              const type = err?.type || "";
              if (type === "popup_failed_to_open") {
                setError("Popup login diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.");
              } else if (type === "popup_closed") {
                setError("Jendela login ditutup sebelum selesai. Silakan coba lagi.");
              } else {
                setError(`Login gagal: ${err?.message || "Tidak diketahui"}. Pastikan domain ini terdaftar di Google Cloud Console.`);
              }
            },
          });
          setGsiReady(true);
        } catch (e) {
          console.error("Token client init failed:", e);
          setError("Gagal menyiapkan Google Sign-In.");
        }
      })
      .catch(() => {
        setError(
          "Gagal memuat Google Sign-In. Periksa koneksi internet atau matikan ad-blocker untuk situs ini."
        );
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  // === Handler untuk Access Token (OAuth popup) ===
  async function handleTokenResponse(resp: { access_token?: string; error?: string }) {
    setError("");
    setInfo("");
    if (!resp.access_token) {
      setError("Login gagal: tidak menerima token dari Google.");
      setBusy(false);
      return;
    }
    setInfo("Mengambil data akun...");
    try {
      const r = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${resp.access_token}` } }
      );
      if (!r.ok) throw new Error("Userinfo " + r.status);
      const data = await r.json();
      if (!data.email) {
        setError("Akun Google tidak memberikan email.");
        setBusy(false);
        return;
      }
      await finalizeLogin({
        email: data.email,
        name: data.name,
        picture: data.picture,
      });
    } catch (e: any) {
      console.error(e);
      setError("Gagal mengambil profil dari Google: " + (e?.message || "error"));
      setBusy(false);
    }
  }

  async function finalizeLogin(p: { email: string; name?: string; picture?: string }) {
    const email = String(p.email).toLowerCase();
    setInfo("Memeriksa akses...");
    let role: any = null;
    try {
      role = await resolveRole(email);
    } catch (e) {
      console.error(e);
      setError("Tidak dapat memverifikasi akses (gagal terhubung ke database). Coba lagi.");
      setBusy(false);
      return;
    }
    if (!role) {
      setError(
        `Akun ${email} tidak memiliki izin akses. Silakan hubungi administrator untuk diundang.`
      );
      setInfo("");
      setBusy(false);
      return;
    }
    const user: CurrentUser = {
      email,
      name: p.name || email,
      picture: p.picture,
      role,
    };
    setCurrentUser(user, rememberRef.current);
    onSuccess(user);
  }

  function handleManualGoogleClick() {
    setError("");
    setInfo("");
    setBusy(true);
    if (!tokenClientRef.current) {
      setError("Google Sign-In belum siap. Muat ulang halaman lalu coba lagi.");
      setBusy(false);
      return;
    }
    try {
      tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
    } catch (e: any) {
      setError("Gagal membuka jendela login: " + (e?.message || "unknown"));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <button
        className="btn-icon absolute top-4 right-4"
        onClick={toggle}
        title="Ganti Tema"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="glass p-7 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6">
          <span
            className="w-10 h-10 rounded-xl grid place-items-center text-lg"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            ◆
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">GlassDeploy</h1>
            <p className="text-xs text-secondary">HTML deploy & analytics</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-1.5">Masuk</h2>
        <p className="text-sm text-secondary mb-6">
          Gunakan akun Google Anda. Akses dibatasi pada email yang diizinkan.
        </p>

        {!configured && (
          <div
            className="text-sm p-3 rounded-lg mb-4"
            style={{
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
              color: "var(--danger)",
            }}
          >
            <strong>Konfigurasi diperlukan:</strong> Google Client ID belum diatur.
          </div>
        )}

        {configured && (
          <button
            type="button"
            onClick={handleManualGoogleClick}
            disabled={!gsiReady || busy}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg font-medium transition-all"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              color: "var(--text-primary)",
              cursor: !gsiReady || busy ? "not-allowed" : "pointer",
              opacity: !gsiReady || busy ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (gsiReady && !busy) e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--input-bg)";
            }}
          >
            <GoogleLogo />
            {busy ? "Memproses..." : !gsiReady ? "Memuat Google..." : "Lanjutkan dengan Google"}
          </button>
        )}

        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none mt-4 mb-3 justify-center">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-current"
          />
          Ingat saya di perangkat ini
        </label>

        {info && (
          <div className="text-sm text-secondary text-center mb-3">{info}</div>
        )}

        {error && (
          <div
            className="text-sm p-3 rounded-lg text-danger"
            style={{
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        <p className="text-xs text-muted mt-6 text-center">
          Akses terbatas · hanya pengguna yang diundang
        </p>
      </div>
    </div>
  );
}
