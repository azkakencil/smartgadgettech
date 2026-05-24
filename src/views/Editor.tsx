import { useEffect, useState } from "react";
import { getPage, savePage, slugify, type Page } from "../lib/firebase";
import { ArrowLeftIcon, SaveIcon, CodeIcon, EyeIcon, LinkIcon } from "../components/Icons";

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      display: grid;
      place-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      text-align: center;
    }
    h1 { font-size: 3rem; margin: 0 0 .5rem; }
    p { opacity: .9; }
  </style>
</head>
<body>
  <div>
    <h1>Hello, World!</h1>
    <p>Edit kode HTML di sebelah kiri untuk memulai.</p>
  </div>
</body>
</html>`;

interface Props {
  editId: string | null;
  onBack: () => void;
  onDeployed: (id: string) => void;
}

export default function Editor({ editId, onBack, onDeployed }: Props) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const [original, setOriginal] = useState<Page | null>(null);

  useEffect(() => {
    (async () => {
      if (editId) {
        const p = await getPage(editId);
        if (p) {
          setTitle(p.title);
          setSlug(p.id);
          setHtml(p.html);
          setOriginal(p);
        }
        setLoaded(true);
      }
    })();
  }, [editId]);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!editId) setSlug(slugify(v));
  }

  async function handleDeploy() {
    if (!title.trim()) {
      alert("Judul wajib diisi.");
      return;
    }
    const finalSlug = slugify(slug || title);
    if (!finalSlug) {
      alert("Slug tidak valid.");
      return;
    }

    setSaving(true);

    const now = Date.now();
    const page: Page = original
      ? { ...original, title, html, id: finalSlug, updatedAt: now }
      : {
          id: finalSlug,
          title,
          html,
          createdAt: now,
          updatedAt: now,
          views: 0,
          uniqueVisitors: 0,
        };

    // if slug changed during edit, also delete old? for simplicity, keep id
    if (editId && editId !== finalSlug) {
      // not allowing slug change in edit to avoid breaking links
      page.id = editId;
    }

    await savePage(page);
    setSaving(false);
    onDeployed(page.id);
  }

  if (!loaded) {
    return <div className="text-center py-12 text-secondary">Memuat editor...</div>;
  }

  const previewUrl = slug ? `${window.location.origin}${window.location.pathname}#${slug}` : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-icon" onClick={onBack} title="Kembali">
          <ArrowLeftIcon />
        </button>
        <h2 className="text-xl font-semibold">{editId ? "Edit Halaman" : "Halaman Baru"}</h2>
        <div className="ml-auto flex gap-2">
          <button className="btn-primary" onClick={handleDeploy} disabled={saving}>
            <SaveIcon /> {saving ? "Menyimpan..." : "Deploy"}
          </button>
        </div>
      </div>

      <div className="glass p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Judul Halaman</label>
            <input
              className="glass-input"
              placeholder="Halaman Saya"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1.5">
              Slug (URL) {editId && <span className="text-muted">— tidak dapat diubah</span>}
            </label>
            <input
              className="glass-input font-mono text-sm"
              placeholder="halaman-saya"
              value={slug}
              disabled={!!editId}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
          </div>
        </div>
        {previewUrl && (
          <div className="text-xs text-secondary inline-flex items-center gap-2 flex-wrap">
            <LinkIcon size={12} />
            <span>URL halaman:</span>
            <code className="px-2 py-1 rounded-md" style={{ background: "var(--input-bg)" }}>
              {previewUrl}
            </code>
          </div>
        )}
      </div>

      <div className="glass p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="toggle-track">
            <button
              className={`toggle-option ${tab === "code" ? "active" : ""}`}
              onClick={() => setTab("code")}
            >
              <CodeIcon size={14} /> Kode HTML
            </button>
            <button
              className={`toggle-option ${tab === "preview" ? "active" : ""}`}
              onClick={() => setTab("preview")}
            >
              <EyeIcon size={14} /> Pratinjau
            </button>
          </div>
          <span className="text-xs text-muted">{html.length.toLocaleString()} karakter</span>
        </div>

        {tab === "code" ? (
          <textarea
            className="glass-input code-editor"
            style={{ minHeight: "500px" }}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            placeholder="Tempel/ tulis kode HTML Anda di sini..."
          />
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--input-border)", background: "#fff" }}
          >
            <iframe
              srcDoc={html}
              sandbox="allow-scripts"
              title="preview"
              style={{ width: "100%", height: "500px", border: "none" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
