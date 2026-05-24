import { useEffect, useState } from "react";
import { getPage, recordVisit, type Page } from "../lib/firebase";

interface Props {
  id: string;
  onBackToApp: () => void;
}

export default function PublicViewer({ id, onBackToApp }: Props) {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await getPage(id);
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPage(p);
      setLoading(false);
      // Record visit (async, fire and forget)
      recordVisit(id).catch(() => {});
      // Set tab title
      document.title = p.title || id;
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-6 text-secondary">Memuat halaman...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-8 max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">404</h1>
          <p className="text-secondary mb-5">
            Halaman <code>#{id}</code> tidak ditemukan.
          </p>
          <button className="btn-primary mx-auto" onClick={onBackToApp}>
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1 }}>
      <iframe
        srcDoc={page!.html}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        title={page!.title}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
