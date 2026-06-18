"use client";

import { useState, useCallback, useEffect } from "react";
import type { AnalysisEntry, Tab } from "@/lib/types";
import { UploadPanel } from "@/components/UploadPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { HistorySection } from "@/components/HistorySection";

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

function parseEntries(raw: (string | AnalysisEntry)[]): AnalysisEntry[] {
  return raw.map((e) => (typeof e === "string" ? JSON.parse(e) : e));
}

async function fetchHistory(): Promise<AnalysisEntry[]> {
  const res = await fetch("/api/history");
  const data = await res.json();
  return parseEntries(data.entries || []);
}

const DIMENSIONS = ["Errores de contenido", "Consistencia", "Reglas implícitas", "Huecos", "Voz y tono", "Formato"];

export default function Home() {
  const [tab, setTab] = useState<Tab>("image");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaToken, setFigmaToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisEntry[]>([]);

  // Restore last analysis from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ux_last_analysis");
      if (saved) {
        const { analysis: a, thumbnail: t, preview: p } = JSON.parse(saved);
        if (a) setAnalysis(a);
        if (t) setThumbnail(t);
        if (p) setPreview(p);
      }
    } catch {}
    fetchHistory().then(setHistory).catch(() => {});
  }, []);

  const refreshHistory = useCallback(() => {
    fetchHistory().then(setHistory).catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImage(file);
    setAnalysis(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setThumbnail(await generateThumbnail(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleClear = useCallback(() => {
    setImage(null);
    setPreview(null);
    setThumbnail(null);
    setAnalysis(null);
    setError(null);
    try { localStorage.removeItem("ux_last_analysis"); } catch {}
  }, []);

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t);
    setAnalysis(null);
    setError(null);
  }, []);

  const saveToLocal = (a: string) => {
    try { localStorage.setItem("ux_last_analysis", JSON.stringify({ analysis: a, thumbnail, preview })); } catch {}
  };

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
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
      saveToLocal(data.analysis);
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
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
      saveToLocal(data.analysis);
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--personal-bg)" }}>
      <header style={{ background: "var(--personal-dark)" }} className="w-full py-4 px-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ background: "var(--personal-blue-mid)" }}>P</div>
            <span className="text-white font-semibold text-lg tracking-tight">personal</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-2"
            style={{ background: "rgba(30,178,245,0.15)", color: "var(--personal-blue-mid)" }}>
            UX Writing Analyzer
          </span>
        </div>
      </header>

      <section className="w-full py-14 px-6"
        style={{ background: "linear-gradient(135deg, var(--personal-navy) 0%, var(--personal-blue) 100%)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-white font-bold text-3xl md:text-4xl leading-tight mb-4">
            Analizá tus pantallas de UX Writing
          </h1>
          <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: "var(--personal-blue-soft)" }}>
            Subí una imagen o pegá un link de Figma y verificá si los textfields de datos personales
            cumplen con los estándares definidos.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {DIMENSIONS.map((d) => (
              <span key={d} className="text-xs px-3 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <UploadPanel
            tab={tab}
            onTabChange={handleTabChange}
            preview={preview}
            image={image}
            isDragging={isDragging}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onFileChange={handleFile}
            onClear={handleClear}
            figmaUrl={figmaUrl}
            figmaToken={figmaToken}
            onFigmaUrlChange={setFigmaUrl}
            onFigmaTokenChange={setFigmaToken}
            isLoading={isLoading}
            onAnalyze={tab === "image" ? handleAnalyzeImage : handleAnalyzeFigma}
          />
          <ResultsPanel analysis={analysis} error={error} isLoading={isLoading} />
        </div>

        <HistorySection entries={history} />
      </main>

      <footer className="w-full py-6 px-6 mt-8" style={{ background: "var(--personal-dark)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            UX Writing Analyzer · Herramienta interna · Personal
          </p>
        </div>
      </footer>
    </div>
  );
}
