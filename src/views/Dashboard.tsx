import { useEffect, useState } from "react";
import { listPages, deletePage, type Page } from "../lib/firebase";
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  UsersIcon,
  ChartIcon,
  ExternalIcon,
  LinkIcon,
  CopyIcon,
} from "../components/Icons";

interface Props {
  canEdit?: boolean;
  onNew: () => void;
  onEdit: (id: string) => void;
  onAnalytics: (id: string) => void;
  onView: (id: string) => void;
}

export default function Dashboard({ canEdit = true, onNew, onEdit, onAnalytics, onView }: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setPages(await listPages());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(`Hapus halaman "${id}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    await deletePage(id);
    refresh();
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    alert("Link disalin:\n" + url);
  }

  const totalPages = pages.length;
  const totalViews = pages.reduce((s, p) => s + (p.views || 0), 0);
  const totalVisitors = pages.reduce((s, p) => s + (p.uniqueVisitors || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Halaman" value={totalPages} icon={<LinkIcon />} />
        <StatCard label="Total Kunjungan" value={totalViews} icon={<EyeIcon />} />
        <StatCard label="Pengunjung Unik" value={totalVisitors} icon={<UsersIcon />} />
      </div>

      {/* Pages list */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">Halaman Anda</h2>
            <p className="text-sm text-secondary">Kelola, edit, dan pantau halaman yang telah dideploy.</p>
          </div>
          {canEdit && (
            <button className="btn-primary" onClick={onNew}>
              <PlusIcon /> Halaman Baru
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-secondary">Memuat...</div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary mb-4">
              {canEdit
                ? "Belum ada halaman. Mulai deploy HTML pertama Anda!"
                : "Belum ada halaman tersedia."}
            </p>
            {canEdit && (
              <button className="btn-primary mx-auto" onClick={onNew}>
                <PlusIcon /> Buat Halaman
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((p) => (
              <div key={p.id} className="glass p-4 hover:scale-[1.005] transition-transform">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold truncate">{p.title || p.id}</h3>
                      <code className="text-xs px-2 py-0.5 rounded-md text-secondary" style={{ background: "var(--input-bg)" }}>
                        #{p.id}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-secondary flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <EyeIcon size={12} /> {p.views || 0} kunjungan
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UsersIcon size={12} /> {p.uniqueVisitors || 0} unik
                      </span>
                      <span>diperbarui {new Date(p.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button className="btn-icon" title="Salin Link" onClick={() => copyLink(p.id)}>
                      <CopyIcon size={16} />
                    </button>
                    <button className="btn-icon" title="Buka" onClick={() => onView(p.id)}>
                      <ExternalIcon size={16} />
                    </button>
                    <button className="btn-icon" title="Analytics" onClick={() => onAnalytics(p.id)}>
                      <ChartIcon />
                    </button>
                    {canEdit && (
                      <>
                        <button className="btn-icon" title="Edit" onClick={() => onEdit(p.id)}>
                          <EditIcon />
                        </button>
                        <button
                          className="btn-icon text-danger"
                          title="Hapus"
                          onClick={() => handleDelete(p.id)}
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-secondary">{label}</span>
        <span className="text-secondary">{icon}</span>
      </div>
      <div className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
