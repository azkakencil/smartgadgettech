import { useEffect, useState } from "react";
import { getPage, getVisitLog, type Page } from "../lib/firebase";
import { ArrowLeftIcon, EyeIcon, UsersIcon, ChartIcon, ExternalIcon } from "../components/Icons";

interface Props {
  id: string;
  onBack: () => void;
  onView: (id: string) => void;
}

export default function Analytics({ id, onBack, onView }: Props) {
  const [page, setPage] = useState<Page | null>(null);
  const [log, setLog] = useState<{ ts: number; ua?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await getPage(id);
      setPage(p);
      const visits = await getVisitLog(id);
      setLog(visits);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-center py-12 text-secondary">Memuat analitik...</div>;
  if (!page) return (
    <div className="glass p-8 text-center">
      <p className="mb-3">Halaman tidak ditemukan.</p>
      <button className="btn-ghost" onClick={onBack}><ArrowLeftIcon /> Kembali</button>
    </div>
  );

  // Build a simple per-day chart from log
  const dayMap: Record<string, number> = {};
  log.forEach((v) => {
    const d = new Date(v.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayMap[key] = (dayMap[key] || 0) + 1;
  });
  // last 14 days
  const days: { key: string; count: number; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ key, count: dayMap[key] || 0, label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-icon" onClick={onBack}><ArrowLeftIcon /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">{page.title}</h2>
          <p className="text-xs text-secondary">Analytics untuk #{page.id}</p>
        </div>
        <button className="btn-ghost" onClick={() => onView(page.id)}>
          <ExternalIcon /> Buka Halaman
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Kunjungan" value={page.views || 0} icon={<EyeIcon />} />
        <Stat label="Pengunjung Unik" value={page.uniqueVisitors || 0} icon={<UsersIcon />} />
        <Stat
          label="Rata-rata / Pengunjung"
          value={page.uniqueVisitors ? +((page.views || 0) / page.uniqueVisitors).toFixed(1) : 0}
          icon={<ChartIcon />}
        />
      </div>

      <div className="glass p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ChartIcon /> 14 Hari Terakhir
        </h3>
        <div className="flex items-end gap-1.5 h-40">
          {days.map((d) => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="text-[10px] text-muted opacity-0 group-hover:opacity-100 tabular-nums">
                {d.count}
              </div>
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? "4px" : "2px",
                  background: d.count > 0 ? "var(--accent)" : "var(--input-border)",
                  opacity: d.count > 0 ? 0.85 : 0.4,
                }}
              />
              <div className="text-[10px] text-muted">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-5">
        <h3 className="font-semibold mb-3">Log Kunjungan Terbaru</h3>
        {log.length === 0 ? (
          <p className="text-sm text-secondary py-6 text-center">Belum ada kunjungan tercatat.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {log.slice(0, 50).map((v, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 p-3 rounded-lg text-sm"
                style={{ background: "var(--input-bg)" }}
              >
                <div className="text-xs text-secondary truncate flex-1">
                  {v.ua || "Unknown device"}
                </div>
                <div className="text-xs text-muted whitespace-nowrap">
                  {new Date(v.ts).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
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
