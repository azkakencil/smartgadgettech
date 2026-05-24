import { useEffect, useState } from "react";
import {
  ROOT_ADMIN_EMAIL,
  addAccess,
  listAccess,
  removeAccess,
  updateRole,
  type AccessEntry,
  type Role,
  type CurrentUser,
} from "../lib/auth";
import { ArrowLeftIcon, PlusIcon, TrashIcon, UsersIcon } from "../components/Icons";

interface Props {
  currentUser: CurrentUser;
  onBack: () => void;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Akses penuh + kelola pengguna",
  editor: "Buat & edit halaman",
  viewer: "Hanya lihat halaman & analitik",
};

export default function AccessManagement({ currentUser, onBack }: Props) {
  const [list, setList] = useState<AccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [adding, setAdding] = useState(false);

  async function refresh() {
    setLoading(true);
    setList(await listAccess());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    const res = await addAccess(email, role, currentUser.email);
    setAdding(false);
    if (!res.ok) {
      alert(res.error || "Gagal menambahkan akses.");
      return;
    }
    setEmail("");
    setRole("editor");
    refresh();
  }

  async function handleRemove(entry: AccessEntry) {
    if (entry.email.toLowerCase() === ROOT_ADMIN_EMAIL) return;
    if (!confirm(`Cabut akses untuk ${entry.email}?`)) return;
    await removeAccess(entry.email);
    refresh();
  }

  async function handleRoleChange(entry: AccessEntry, newRole: Role) {
    if (entry.email.toLowerCase() === ROOT_ADMIN_EMAIL) return;
    await updateRole(entry.email, newRole);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-icon" onClick={onBack}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UsersIcon /> Manajemen Akses
          </h2>
          <p className="text-xs text-secondary">
            Atur siapa saja yang boleh masuk ke dashboard ini.
          </p>
        </div>
      </div>

      {/* Add new */}
      <form onSubmit={handleAdd} className="glass p-5 space-y-3">
        <h3 className="font-semibold">Undang Pengguna Baru</h3>
        <p className="text-sm text-secondary">
          Pengguna akan dapat masuk dengan akun Google yang menggunakan email berikut.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
          <input
            type="email"
            className="glass-input"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            className="glass-input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button className="btn-primary" type="submit" disabled={adding}>
            <PlusIcon /> {adding ? "Menambah..." : "Tambah"}
          </button>
        </div>
        <div className="text-xs text-secondary">
          <strong>{ROLE_LABELS[role]}:</strong> {ROLE_DESCRIPTIONS[role]}
        </div>
      </form>

      {/* List */}
      <div className="glass p-5">
        <h3 className="font-semibold mb-3">Pengguna ({list.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-secondary">Memuat...</div>
        ) : (
          <div className="space-y-2">
            {list.map((entry) => {
              const isRoot = entry.email.toLowerCase() === ROOT_ADMIN_EMAIL;
              const isMe = entry.email.toLowerCase() === currentUser.email.toLowerCase();
              // Sembunyikan email root admin kecuali untuk root admin itu sendiri
              const displayEmail = isRoot && !isMe ? "••••••• (System Administrator)" : entry.email;
              const avatarChar = isRoot && !isMe ? "★" : entry.email[0]?.toUpperCase();
              return (
                <div
                  key={entry.email}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg flex-wrap"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-full grid place-items-center text-sm font-semibold flex-shrink-0"
                      style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                    >
                      {avatarChar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate flex items-center gap-2 flex-wrap">
                        {displayEmail}
                        {isRoot && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                          >
                            SYSTEM
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-secondary"
                            style={{ background: "var(--hover-bg)" }}
                          >
                            anda
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {entry.addedAt
                          ? `ditambahkan ${new Date(entry.addedAt).toLocaleDateString()}`
                          : "admin sistem"}
                        {entry.addedBy && entry.addedBy !== "system" && ` · oleh ${entry.addedBy}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="glass-input"
                      style={{ width: "auto", padding: "6px 10px", fontSize: "13px" }}
                      value={entry.role}
                      disabled={isRoot}
                      onChange={(e) => handleRoleChange(entry, e.target.value as Role)}
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-icon text-danger"
                      title={isRoot ? "Tidak dapat menghapus root admin" : "Cabut Akses"}
                      disabled={isRoot}
                      onClick={() => handleRemove(entry)}
                      style={isRoot ? { opacity: 0.3, cursor: "not-allowed" } : undefined}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass p-4 text-xs text-secondary">
        <strong className="text-primary">Catatan:</strong> Akun{" "}
        <em>System Administrator</em> adalah administrator bawaan sistem dan
        tidak dapat dihapus atau diubah perannya.
      </div>
    </div>
  );
}
