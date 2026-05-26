import { useState } from "react";
import {
  setCurrentUser,
  verifyBirthday,
  verifySecretCode,
  verifySecretName,
  SECRET_NAME,
  type CurrentUser,
} from "../lib/auth";
import { useTheme } from "../lib/theme";
import { SunIcon, MoonIcon, ArrowLeftIcon } from "../components/Icons";

function CakeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" />
      <path d="M7 8v2M12 8v2M17 8v2" />
      <path d="M7 4c0 1 1 1 1 2s-1 1-1 2M12 3c0 1.5 1 1.5 1 3s-1 1.5-1 3M17 4c0 1 1 1 1 2s-1 1-1 2" />
    </svg>
  );
}

function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

type Step = "birthday" | "code" | "name";

export default function Login({ onSuccess }: { onSuccess: (user: CurrentUser) => void }) {
  const { theme, toggle } = useTheme();
  const [step, setStep] = useState<Step>("birthday");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [code, setCode] = useState("");
  const [secretName, setSecretName] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  // ===== Step 1: Birthday =====
  function handleBirthdaySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!d || !m || !y) {
      setError("Lengkapi tanggal, bulan, dan tahun.");
      return;
    }
    if (!verifyBirthday(d, m, y)) {
      setError("Tanggal lahir tidak cocok.");
      return;
    }
    setError("");
    setStep("code");
  }

  // ===== Step 2: Secret code =====
  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!verifySecretCode(code)) {
      setError("Kode akses salah. Coba lagi.");
      return;
    }
    setCode("");
    setStep("name");
  }

  // ===== Step 3: Secret name =====
  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!verifySecretName(secretName)) {
      setError("Nama tidak cocok. Coba lagi.");
      return;
    }
    setBusy(true);
    const user: CurrentUser = {
      name: SECRET_NAME,
      role: "admin",
      loggedInAt: Date.now(),
    };
    setCurrentUser(user, remember);
    onSuccess(user);
  }

  function resetAll() {
    setStep("birthday");
    setDay("");
    setMonth("");
    setYear("");
    setCode("");
    setSecretName("");
    setError("");
  }

  const stepNum = step === "birthday" ? 1 : step === "code" ? 2 : 3;

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
        {/* Header */}
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

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className="w-7 h-7 rounded-full grid place-items-center text-xs font-semibold transition-all flex-shrink-0"
                style={{
                  background: n <= stepNum ? "var(--accent)" : "var(--input-bg)",
                  color: n <= stepNum ? "var(--accent-text)" : "var(--text-muted)",
                  border: "1px solid var(--input-border)",
                }}
              >
                {n < stepNum ? "✓" : n}
              </div>
              {n < 3 && (
                <div
                  className="flex-1 h-px transition-all"
                  style={{ background: n < stepNum ? "var(--accent)" : "var(--input-border)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* === STEP 1: Birthday === */}
        {step === "birthday" && (
          <form onSubmit={handleBirthdaySubmit}>
            <h2 className="text-2xl font-semibold mb-1.5">Masuk</h2>
            <p className="text-sm text-secondary mb-5">
              Langkah 1 dari 3 — Masukkan <strong>tanggal lahir</strong>.
            </p>

            <label className="block text-xs text-secondary mb-1.5 flex items-center gap-1.5">
              <CakeIcon size={12} /> Tanggal Lahir
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                className="glass-input text-center"
                placeholder="DD"
                min={1}
                max={31}
                value={day}
                onChange={(e) => {
                  setDay(e.target.value);
                  if (error) setError("");
                }}
                autoFocus
              />
              <input
                type="number"
                className="glass-input text-center"
                placeholder="MM"
                min={1}
                max={12}
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  if (error) setError("");
                }}
              />
              <input
                type="number"
                className="glass-input text-center"
                placeholder="YYYY"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            <p className="text-[11px] text-muted mt-1.5">Format: hari / bulan / tahun</p>

            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none mt-4 mb-4 justify-center">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-current"
              />
              Ingat saya di perangkat ini
            </label>

            <button type="submit" className="btn-primary w-full" disabled={!day || !month || !year}>
              Lanjutkan
            </button>
          </form>
        )}

        {/* === STEP 2: Secret code === */}
        {step === "code" && (
          <form onSubmit={handleCodeSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" className="btn-icon" onClick={resetAll} title="Kembali">
                <ArrowLeftIcon size={16} />
              </button>
              <h2 className="text-2xl font-semibold">Verifikasi</h2>
            </div>
            <p className="text-sm text-secondary mb-5">
              Langkah 2 dari 3 — Masukkan <strong>kode akses</strong>.
            </p>

            <label className="block text-xs text-secondary mb-1.5 flex items-center gap-1.5">
              <LockIcon size={12} /> Kode Akses
            </label>
            <input
              type="password"
              className="glass-input"
              placeholder="••••••••••••••••"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError("");
              }}
              autoFocus
              autoComplete="off"
            />

            <button type="submit" className="btn-primary w-full mt-4" disabled={!code}>
              Lanjutkan
            </button>
          </form>
        )}

        {/* === STEP 3: Secret name === */}
        {step === "name" && (
          <form onSubmit={handleNameSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setStep("code");
                  setError("");
                  setSecretName("");
                }}
                title="Kembali"
              >
                <ArrowLeftIcon size={16} />
              </button>
              <h2 className="text-2xl font-semibold">Verifikasi Akhir</h2>
            </div>
            <p className="text-sm text-secondary mb-5">
              Langkah 3 dari 3 — Masukkan <strong>nama rahasia</strong>.
            </p>

            <label className="block text-xs text-secondary mb-1.5 flex items-center gap-1.5">
              <KeyIcon size={12} /> Nama Rahasia
            </label>
            <input
              type="password"
              className="glass-input"
              placeholder="••••••••••••••••"
              value={secretName}
              onChange={(e) => {
                setSecretName(e.target.value);
                if (error) setError("");
              }}
              autoFocus
              autoComplete="off"
            />

            <button type="submit" className="btn-primary w-full mt-4" disabled={!secretName || busy}>
              {busy ? "Memproses..." : "Masuk"}
            </button>
          </form>
        )}

        {error && (
          <div
            className="text-sm p-3 rounded-lg text-danger mt-4"
            style={{
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        <p className="text-xs text-muted mt-6 text-center">
          Akses terbatas · keamanan berlapis
        </p>
      </div>
    </div>
  );
}
