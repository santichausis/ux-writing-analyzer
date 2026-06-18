"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

function parseAnalysis(text: string) {
  const lines = text.split("\n");
  const result: { type: "heading" | "text" | "ok" | "error" | "info"; content: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#")) {
      result.push({ type: "heading", content: trimmed.replace(/^#+\s*/, "") });
    } else if (trimmed.includes("✅")) {
      result.push({ type: "ok", content: trimmed });
    } else if (trimmed.includes("❌")) {
      result.push({ type: "error", content: trimmed });
    } else if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•")) {
      result.push({ type: "info", content: trimmed.replace(/^[-*•]\s*/, "") });
    } else {
      result.push({ type: "text", content: trimmed });
    }
  }
  return result;
}

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImage(file);
    setAnalysis(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
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

  const handleAnalyze = async () => {
    if (!image) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setIsLoading(false);
    }
  };

  const parsed = analysis ? parseAnalysis(analysis) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--personal-bg)" }}>
      {/* Header */}
      <header
        style={{ background: "var(--personal-dark)" }}
        className="w-full py-4 px-6 shadow-lg"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ background: "var(--personal-accent)" }}
            >
              P
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">personal</span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium ml-2"
            style={{ background: "rgba(0,200,255,0.15)", color: "var(--personal-accent)" }}
          >
            UX Writing Analyzer
          </span>
        </div>
      </header>

      {/* Hero */}
      <section
        className="w-full py-14 px-6"
        style={{
          background: "linear-gradient(135deg, var(--personal-dark) 0%, var(--personal-blue) 100%)",
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-white font-bold text-3xl md:text-4xl leading-tight mb-4">
            Analizá tus pantallas de UX Writing
          </h1>
          <p className="text-blue-200 text-base md:text-lg max-w-xl mx-auto">
            Subí una captura de pantalla y verificá si los textfields de datos personales cumplen
            con los estándares definidos.
          </p>
        </div>
      </section>

      {/* Main */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Upload panel */}
          <div
            className="rounded-2xl overflow-hidden shadow-sm border"
            style={{ background: "white", borderColor: "var(--personal-light-gray)" }}
          >
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--personal-light-gray)" }}>
              <h2 className="font-semibold text-base" style={{ color: "var(--personal-dark)" }}>
                1. Subí tu imagen
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--personal-gray)" }}>
                PNG, JPG o WEBP — máx. 10 MB
              </p>
            </div>

            <div className="p-6">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-52 select-none"
                style={{
                  borderColor: isDragging ? "var(--personal-accent)" : "var(--personal-light-gray)",
                  background: isDragging ? "rgba(0,200,255,0.04)" : "var(--personal-bg)",
                }}
              >
                {preview ? (
                  <div className="relative w-full h-52">
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "var(--personal-light-gray)" }}
                    >
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                        <path
                          d="M12 16V8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1"
                          stroke="#0032a0"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--personal-blue)" }}>
                        Arrastrá una imagen aquí
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--personal-gray)" }}>
                        o hacé clic para seleccionarla
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {image && (
                <p className="text-xs mt-2 truncate" style={{ color: "var(--personal-gray)" }}>
                  {image.name}
                </p>
              )}

              {/* CTA */}
              <button
                onClick={handleAnalyze}
                disabled={!image || isLoading}
                className="mt-5 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: image && !isLoading
                    ? "linear-gradient(90deg, var(--personal-blue) 0%, var(--personal-light-blue) 100%)"
                    : "var(--personal-light-gray)",
                  color: image && !isLoading ? "white" : "var(--personal-gray)",
                }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analizando...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Analizar pantalla
                  </>
                )}
              </button>

              {image && (
                <button
                  onClick={() => { setImage(null); setPreview(null); setAnalysis(null); setError(null); }}
                  className="mt-2 w-full py-2 text-xs rounded-lg transition-colors"
                  style={{ color: "var(--personal-gray)" }}
                >
                  Limpiar imagen
                </button>
              )}
            </div>
          </div>

          {/* Results panel */}
          <div
            className="rounded-2xl overflow-hidden shadow-sm border"
            style={{ background: "white", borderColor: "var(--personal-light-gray)", minHeight: "360px" }}
          >
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--personal-light-gray)" }}>
              <h2 className="font-semibold text-base" style={{ color: "var(--personal-dark)" }}>
                2. Resultado del análisis
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--personal-gray)" }}>
                Se compara contra la base de conocimiento de textfields personales
              </p>
            </div>

            <div className="p-6">
              {!analysis && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center h-56 text-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "var(--personal-bg)" }}
                  >
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12h6m-3-3v6m9-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#c7d2e8" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: "var(--personal-gray)" }}>
                    El análisis aparecerá acá después de procesar la imagen.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center h-56 gap-4">
                  <div
                    className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--personal-light-gray)", borderTopColor: "var(--personal-blue)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--personal-gray)" }}>
                    Procesando con IA...
                  </p>
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl p-4 text-sm"
                  style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #f5c6cb" }}
                >
                  <strong>Error:</strong> {error}
                </div>
              )}

              {parsed && (
                <div className="prose-result text-sm space-y-1 max-h-[520px] overflow-y-auto pr-1">
                  {parsed.map((item, i) => {
                    if (item.type === "heading") {
                      return (
                        <h3
                          key={i}
                          className="font-bold text-sm mt-4 mb-1 pt-3 border-t first:border-t-0 first:pt-0"
                          style={{ color: "var(--personal-dark)", borderColor: "var(--personal-light-gray)" }}
                        >
                          {item.content}
                        </h3>
                      );
                    }
                    if (item.type === "ok") {
                      return (
                        <div key={i} className="flex gap-2 py-1 px-2 rounded-lg" style={{ background: "#f0faf4" }}>
                          <span className="shrink-0">✅</span>
                          <span style={{ color: "#1a6b3a" }}>{item.content.replace("✅", "").trim()}</span>
                        </div>
                      );
                    }
                    if (item.type === "error") {
                      return (
                        <div key={i} className="flex gap-2 py-1 px-2 rounded-lg" style={{ background: "#fff5f5" }}>
                          <span className="shrink-0">❌</span>
                          <span style={{ color: "#c0392b" }}>{item.content.replace("❌", "").trim()}</span>
                        </div>
                      );
                    }
                    if (item.type === "info") {
                      return (
                        <div key={i} className="flex gap-2 py-0.5 pl-2">
                          <span style={{ color: "var(--personal-blue)" }}>•</span>
                          <span style={{ color: "#374151" }}>{item.content}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={i} style={{ color: "#374151" }} className="leading-relaxed">
                        {item.content}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info pills */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {["Nombre y apellido", "DNI y documento", "Número de trámite", "Email", "Teléfono"].map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: "var(--personal-light-gray)", color: "var(--personal-blue)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="w-full py-6 px-6 mt-8"
        style={{ background: "var(--personal-dark)" }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            UX Writing Analyzer · Herramienta interna · Personal
          </p>
        </div>
      </footer>
    </div>
  );
}
