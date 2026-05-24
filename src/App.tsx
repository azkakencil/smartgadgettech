import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "./lib/theme";
import {
  getCurrentUser,
  logout,
  type CurrentUser,
} from "./lib/auth";
import Dashboard from "./views/Dashboard";
import Editor from "./views/Editor";
import Analytics from "./views/Analytics";
import PublicViewer from "./views/PublicViewer";
import Login from "./views/Login";
import { SunIcon, MoonIcon } from "./components/Icons";

type AppRoute =
  | { name: "dashboard" }
  | { name: "new" }
  | { name: "edit"; id: string }
  | { name: "analytics"; id: string };

function parseHash(): { isPublic: boolean; route: AppRoute; publicId?: string } {
  const raw = (window.location.hash || "").replace(/^#/, "");
  if (!raw) return { isPublic: false, route: { name: "dashboard" } };
  if (raw === "__new") return { isPublic: false, route: { name: "new" } };
  if (raw.startsWith("__edit/")) return { isPublic: false, route: { name: "edit", id: raw.slice(7) } };
  if (raw.startsWith("__analytics/"))
    return { isPublic: false, route: { name: "analytics", id: raw.slice(12) } };
  return { isPublic: true, publicId: raw, route: { name: "dashboard" } };
}

function setHash(h: string) {
  window.location.hash = h;
}

function LogoutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function AppInner() {
  const { theme, toggle } = useTheme();
  const [hashState, setHashState] = useState(parseHash());
  const [user, setUser] = useState<CurrentUser | null>(getCurrentUser());

  useEffect(() => {
    const onHash = () => setHashState(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Public page view (full screen iframe) - NO LOGIN REQUIRED
  if (hashState.isPublic && hashState.publicId) {
    return <PublicViewer id={hashState.publicId} onBackToApp={() => setHash("")} />;
  }

  // Login gate
  if (!user) {
    return <Login onSuccess={(u) => setUser(u)} />;
  }

  const route = hashState.route;

  function handleLogout() {
    if (!confirm("Keluar dari sesi ini?")) return;
    logout();
    setUser(null);
    setHash("");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3" style={{ backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto glass px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 font-semibold text-base hover:opacity-80 transition-opacity"
            onClick={() => setHash("")}
          >
            <span
              className="w-7 h-7 rounded-lg grid place-items-center"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              ◆
            </span>
            GlassDeploy
          </button>

          <div className="flex items-center gap-2">
            {/* User badge */}
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
              title={`Masuk sebagai ${user.name}`}
            >
              <span
                className="w-5 h-5 rounded-full grid place-items-center text-[10px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {user.name[0]?.toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate">{user.name}</span>
              <span className="text-muted">·</span>
              <span className="text-secondary capitalize">{user.role}</span>
            </div>

            <button className="btn-icon" onClick={toggle} title="Ganti Tema">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="btn-icon text-danger" onClick={handleLogout} title="Keluar">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {route.name === "dashboard" && (
          <Dashboard
            onNew={() => setHash("__new")}
            onEdit={(id) => setHash(`__edit/${id}`)}
            onAnalytics={(id) => setHash(`__analytics/${id}`)}
            onView={(id) => setHash(id)}
          />
        )}
        {route.name === "new" && (
          <Editor editId={null} onBack={() => setHash("")} onDeployed={(id) => setHash(`__analytics/${id}`)} />
        )}
        {route.name === "edit" && (
          <Editor editId={route.id} onBack={() => setHash("")} onDeployed={(id) => setHash(`__analytics/${id}`)} />
        )}
        {route.name === "analytics" && (
          <Analytics id={route.id} onBack={() => setHash("")} onView={(id) => setHash(id)} />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted">
        GlassDeploy · HTML hosting sederhana dengan analitik bawaan
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
