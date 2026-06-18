"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  analysis: string | null;
  error: string | null;
  isLoading: boolean;
}

const DIMENSIONS = ["Contenido", "Consistencia", "Reglas", "Huecos", "Voz/tono", "Formato"];

export function ResultsPanel({ analysis, error, isLoading }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "var(--personal-white)", borderColor: "var(--personal-border)", minHeight: "360px" }}>
      <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--personal-border)" }}>
        <h2 className="font-semibold text-base" style={{ color: "var(--personal-dark)" }}>Resultado del análisis</h2>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {DIMENSIONS.map((d) => (
            <span key={d} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--personal-bg-bold)", color: "var(--personal-blue)" }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6">
        {!analysis && !error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-56 text-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--personal-bg)" }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path d="M9 12h6m-3-3v6m9-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="var(--personal-border-mid)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--personal-gray)" }}>
              El análisis aparecerá acá después de procesar la imagen.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-56 gap-4">
            <div className="w-12 h-12 rounded-full border-4 animate-spin"
              style={{ borderColor: "var(--personal-border)", borderTopColor: "var(--personal-blue)" }} />
            <p className="text-sm" style={{ color: "var(--personal-gray)" }}>Procesando con IA...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ background: "var(--personal-error-soft)", color: "var(--personal-error)", border: "1px solid #ffb4a9" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {analysis && (
          <div className="max-h-[560px] overflow-y-auto pr-1">
            <MarkdownRenderer content={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}
