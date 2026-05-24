import { useState } from "react";
import { tryLogin } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { SunIcon, MoonIcon } from "../components/Icons";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const { theme, toggle } = useTheme();
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // small delay so it feels responsive
    setTimeout(() => {
      if (tryLogin(code, remember)) {
        onSuccess();
      } else {
        setError("Kode akses salah. Coba lagi.");
        setLoading(false);
      }
    }, 300);
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
          Masukkan kode akses untuk melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Kode Akses</label>
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
          </div>

          <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-current"
            />
            Ingat saya di perangkat ini
          </label>

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

          <button type="submit" className="btn-primary w-full" disabled={loading || !code}>
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <p className="text-xs text-muted mt-6 text-center">
          Akses dibatasi. Hubungi administrator jika tidak memiliki kode.
        </p>
      </div>
    </div>
  );
}
