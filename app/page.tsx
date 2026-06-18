"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import type { AnalysisEntry } from "@/lib/redis";

// Generate a small thumbnail via Canvas (client-side, ~200px wide)
function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 240;
      const ratio = Math.min(MAX / img.width, MAX / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = url;
  });
}

function parseAnalysis(text: string) {
  const lines = text.split("\n");
  const result: { type: "heading" | "text" | "ok" | "error" | "badge-alta" | "badge-media" | "badge-baja" | "info"; content: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#+\s/.test(trimmed)) {
      result.push({ type: "heading", content: trimmed.replace(/^#+\s*/, "") });
    } else if (trimmed.includes("✅")) {
      result.push({ type: "ok", content: trimmed });
    } else if (trimmed.includes("❌")) {
      result.push({ type: "error", content: trimmed });
    } else if (/Severidad:\s*Alta/i.test(trimmed)) {
      result.push({ type: "badge-alta", content: trimmed });
    } else if (/Severidad:\s*Media/i.test(trimmed)) {
      result.push({ type: "badge-media", content: trimmed });
    } else if (/Severidad:\s*Baja/i.test(trimmed)) {
      result.push({ type: "badge-baja", content: trimmed });
    } else if (/^[-*•]/.test(trimmed)) {
      result.push({ type: "info", content: trimmed.replace(/^[-*•]\s*/, "") });
    } else {
      result.push({ type: "text", content: trimmed });
    }
  }
  return result;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hace un momento";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

type Tab = "image" | "figma";

export default function Home() {
  const [tab, setTab] = useState<Tab>("image");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaToken, setFigmaToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AnalysisEntry | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => {
        const entries = (d.entries || []).map((e: string | AnalysisEntry) =>
          typeof e === "string" ? JSON.parse(e) : e
        );
        setHistory(entries);
      })
      .catch(() => {});
  }, []);

  const refreshHistory = useCallback(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => {
        const entries = (d.entries || []).map((e: string | AnalysisEntry) =>
          typeof e === "string" ? JSON.parse(e) : e
        );
        setHistory(entries);
      })
      .catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImage(file);
    setAnalysis(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    const thumb = await generateThumbnail(file);
    setThumbnail(thumb);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyzeImage = async () => {
    if (!image) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const formData = new FormData();
      formData.append("image", image);
      if (thumbnail) formData.append("thumbnail", thumbnail);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setAnalysis(data.analysis);
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeFigma = async () => {
    if (!figmaUrl) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl, figmaToken: figmaToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setAnalysis(data.analysis);
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setIsLoading(false);
    }
  };

  const canAnalyze = tab === "image" ? !!image : !!figmaUrl;
  const handleAnalyze = tab === "image" ? handleAnalyzeImage : handleAnalyzeFigma;
  const parsed = analysis ? parseAnalysis(analysis) : null;
  const selectedParsed = selectedEntry ? parseAnalysis(selectedEntry.analysis) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--personal-bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--personal-dark)" }} className="w-full py-4 px-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: "var(--personal-accent)" }}>P</div>
            <span className="text-white font-semibold text-lg tracking-tight">personal</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-2" style={{ background: "rgba(0,200,255,0.15)", color: "var(--personal-accent)" }}>
            UX Writing Analyzer
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full py-14 px-6" style={{ background: "linear-gradient(135deg, var(--personal-dark) 0%, var(--personal-blue) 100%)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-white font-bold text-3xl md:text-4xl leading-tight mb-4">Analizá tus pantallas de UX Writing</h1>
          <p className="text-blue-200 text-base md:text-lg max-w-xl mx-auto">
            Subí una imagen o pegá un link de Figma y verificá si los textfields de datos personales cumplen con los estándares definidos.
          </p>
        </div>
      </section>

      {/* Main */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* Input panel */}
          <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "white", borderColor: "var(--personal-light-gray)" }}>
            <div className="flex border-b" style={{ borderColor: "var(--personal-light-gray)" }}>
              {(["image", "figma"] as Tab[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); setAnalysis(null); setError(null); }}
                  className="flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{ color: tab === t ? "var(--personal-blue)" : "var(--personal-gray)", borderBottom: tab === t ? "2px solid var(--personal-blue)" : "2px solid transparent", background: "transparent" }}
                >
                  {t === "image" ? (
                    <><svg width="15" height="15" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="m3 15 5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Subir imagen</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 38 57" fill="none"><path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5Z" fill="currentColor"/><path d="M9.5 57A9.5 9.5 0 0 1 9.5 38H19V57Z" fill="currentColor" opacity=".6"/><path d="M0 19A9.5 9.5 0 0 1 9.5 9.5H19V28.5H9.5A9.5 9.5 0 0 1 0 19Z" fill="currentColor" opacity=".6"/><path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19V19H9.5A9.5 9.5 0 0 1 0 9.5Z" fill="currentColor" opacity=".4"/><path d="M19 0H28.5A9.5 9.5 0 0 1 28.5 19H19Z" fill="currentColor" opacity=".4"/></svg>Link de Figma</>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "image" && (
                <>
                  <p className="text-xs mb-4" style={{ color: "var(--personal-gray)" }}>PNG, JPG o WEBP — máx. 10 MB</p>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-52 select-none"
                    style={{ borderColor: isDragging ? "var(--personal-accent)" : "var(--personal-light-gray)", background: isDragging ? "rgba(0,200,255,0.04)" : "var(--personal-bg)" }}
                  >
                    {preview ? (
                      <div className="relative w-full h-52"><Image src={preview} alt="Preview" fill className="object-contain rounded-lg" /></div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--personal-light-gray)" }}>
                          <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 16V8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" stroke="#0032a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: "var(--personal-blue)" }}>Arrastrá una imagen aquí</p>
                          <p className="text-xs mt-1" style={{ color: "var(--personal-gray)" }}>o hacé clic para seleccionarla</p>
                        </div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                  {image && <p className="text-xs mt-2 truncate" style={{ color: "var(--personal-gray)" }}>{image.name}</p>}
                </>
              )}

              {tab === "figma" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--personal-dark)" }}>URL del frame o pantalla</label>
                    <input type="url" placeholder="https://www.figma.com/file/…?node-id=118:10566" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ border: "1.5px solid var(--personal-light-gray)", background: "var(--personal-bg)", color: "var(--personal-dark)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--personal-blue)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--personal-light-gray)")}
                    />
                    <p className="text-xs mt-1.5" style={{ color: "var(--personal-gray)" }}>Botón derecho sobre el frame en Figma → "Copy link"</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--personal-dark)" }}>
                      Personal Access Token <span className="font-normal" style={{ color: "var(--personal-gray)" }}>(opcional)</span>
                    </label>
                    <input type="password" placeholder="figd_…" value={figmaToken} onChange={(e) => setFigmaToken(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ border: "1.5px solid var(--personal-light-gray)", background: "var(--personal-bg)", color: "var(--personal-dark)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--personal-blue)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--personal-light-gray)")}
                    />
                  </div>
                </div>
              )}

              <button onClick={handleAnalyze} disabled={!canAnalyze || isLoading}
                className="mt-5 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: canAnalyze && !isLoading ? "linear-gradient(90deg, var(--personal-blue) 0%, var(--personal-light-blue) 100%)" : "var(--personal-light-gray)", color: canAnalyze && !isLoading ? "white" : "var(--personal-gray)" }}
              >
                {isLoading ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Analizando...</>
                ) : (
                  <><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Analizar pantalla</>
                )}
              </button>
              {image && tab === "image" && (
                <button onClick={() => { setImage(null); setPreview(null); setThumbnail(null); setAnalysis(null); setError(null); }}
                  className="mt-2 w-full py-2 text-xs rounded-lg" style={{ color: "var(--personal-gray)" }}>
                  Limpiar imagen
                </button>
              )}
            </div>
          </div>

          {/* Results panel */}
          <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "white", borderColor: "var(--personal-light-gray)", minHeight: "360px" }}>
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--personal-light-gray)" }}>
              <h2 className="font-semibold text-base" style={{ color: "var(--personal-dark)" }}>Resultado del análisis</h2>
              <p className="text-sm mt-1" style={{ color: "var(--personal-gray)" }}>Evaluado con la rúbrica de 6 dimensiones</p>
            </div>
            <div className="p-6">
              {!analysis && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center h-56 text-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--personal-bg)" }}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M9 12h6m-3-3v6m9-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#c7d2e8" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                  <p className="text-sm" style={{ color: "var(--personal-gray)" }}>El análisis aparecerá acá después de procesar la imagen.</p>
                </div>
              )}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-56 gap-4">
                  <div className="w-12 h-12 rounded-full border-4 animate-spin" style={{ borderColor: "var(--personal-light-gray)", borderTopColor: "var(--personal-blue)" }}/>
                  <p className="text-sm" style={{ color: "var(--personal-gray)" }}>Procesando con IA...</p>
                </div>
              )}
              {error && (
                <div className="rounded-xl p-4 text-sm" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #f5c6cb" }}>
                  <strong>Error:</strong> {error}
                </div>
              )}
              {parsed && <AnalysisResult items={parsed} />}
            </div>
          </div>
        </div>

        {/* Pills */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {["Nombre y apellido", "DNI y documento", "Número de trámite", "Email", "Teléfono"].map((tag) => (
            <span key={tag} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "var(--personal-light-gray)", color: "var(--personal-blue)" }}>{tag}</span>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-bold text-lg" style={{ color: "var(--personal-dark)" }}>Últimos análisis</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--personal-light-gray)", color: "var(--personal-blue)" }}>{history.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {history.map((entry) => (
                <button key={entry.id} onClick={() => setSelectedEntry(entry)}
                  className="rounded-xl overflow-hidden border text-left transition-all hover:shadow-md hover:-translate-y-0.5 duration-150"
                  style={{ background: "white", borderColor: "var(--personal-light-gray)" }}
                >
                  <div className="relative w-full h-28 bg-gray-100">
                    {entry.thumbnail && (
                      <Image src={entry.thumbnail} alt="Análisis" fill className="object-cover" unoptimized />
                    )}
                    <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: entry.source === "figma" ? "rgba(0,50,160,0.85)" : "rgba(0,0,0,0.6)", color: "white" }}>
                      {entry.source === "figma" ? "Figma" : "IMG"}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--personal-dark)" }}>
                      {entry.filename || entry.figmaUrl?.split("?")[0].split("/").pop() || "Pantalla"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--personal-gray)" }}>{timeAgo(entry.timestamp)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="w-full py-6 px-6 mt-8" style={{ background: "var(--personal-dark)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>UX Writing Analyzer · Herramienta interna · Personal</p>
        </div>
      </footer>

      {/* History modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,10,40,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEntry(null); }}
        >
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row" style={{ background: "white", maxHeight: "90vh" }}>
            {/* Image side */}
            <div className="md:w-48 flex-shrink-0 bg-gray-100 relative min-h-40">
              {selectedEntry.thumbnail && (
                <Image src={selectedEntry.thumbnail} alt="Análisis" fill className="object-cover" unoptimized />
              )}
            </div>
            {/* Content side */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 border-b flex items-start justify-between gap-4" style={{ borderColor: "var(--personal-light-gray)" }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--personal-dark)" }}>
                    {selectedEntry.filename || selectedEntry.figmaUrl || "Análisis"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--personal-gray)" }}>{timeAgo(selectedEntry.timestamp)}</p>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {selectedParsed && <AnalysisResult items={selectedParsed} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ParsedItem = { type: "heading" | "text" | "ok" | "error" | "badge-alta" | "badge-media" | "badge-baja" | "info"; content: string };

function AnalysisResult({ items }: { items: ParsedItem[] }) {
  return (
    <div className="text-sm space-y-1 pr-1">
      {items.map((item, i) => {
        if (item.type === "heading") return (
          <h3 key={i} className="font-bold text-sm mt-4 mb-1 pt-3 border-t first:border-t-0 first:mt-0 first:pt-0" style={{ color: "var(--personal-dark)", borderColor: "var(--personal-light-gray)" }}>{item.content}</h3>
        );
        if (item.type === "ok") return (
          <div key={i} className="flex gap-2 py-1 px-2 rounded-lg" style={{ background: "#f0faf4" }}>
            <span className="shrink-0">✅</span><span style={{ color: "#1a6b3a" }}>{item.content.replace("✅", "").trim()}</span>
          </div>
        );
        if (item.type === "error") return (
          <div key={i} className="flex gap-2 py-1 px-2 rounded-lg" style={{ background: "#fff5f5" }}>
            <span className="shrink-0">❌</span><span style={{ color: "#c0392b" }}>{item.content.replace("❌", "").trim()}</span>
          </div>
        );
        if (item.type === "badge-alta") return (
          <div key={i} className="flex gap-2 items-center py-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#fef2f2", color: "#c0392b" }}>Alta</span>
            <span style={{ color: "#374151" }}>{item.content.replace(/Severidad:\s*Alta/i, "").trim()}</span>
          </div>
        );
        if (item.type === "badge-media") return (
          <div key={i} className="flex gap-2 items-center py-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#fffbeb", color: "#b45309" }}>Media</span>
            <span style={{ color: "#374151" }}>{item.content.replace(/Severidad:\s*Media/i, "").trim()}</span>
          </div>
        );
        if (item.type === "badge-baja") return (
          <div key={i} className="flex gap-2 items-center py-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#f0fdf4", color: "#16a34a" }}>Baja</span>
            <span style={{ color: "#374151" }}>{item.content.replace(/Severidad:\s*Baja/i, "").trim()}</span>
          </div>
        );
        if (item.type === "info") return (
          <div key={i} className="flex gap-2 py-0.5 pl-2">
            <span style={{ color: "var(--personal-blue)" }}>•</span><span style={{ color: "#374151" }}>{item.content}</span>
          </div>
        );
        return <p key={i} style={{ color: "#374151" }} className="leading-relaxed">{item.content}</p>;
      })}
    </div>
  );
}
