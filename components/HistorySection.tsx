"use client";

import { useState } from "react";
import Image from "next/image";
import type { AnalysisEntry } from "@/lib/types";
import { StructuredResults } from "./StructuredResults";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hace un momento";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

function quickStats(analysis: string) {
  const alta  = (analysis.match(/Severidad[:\s*]*\*{0,2}Alta/gi)  || []).length;
  const media = (analysis.match(/Severidad[:\s*]*\*{0,2}Media/gi) || []).length;
  const baja  = (analysis.match(/Severidad[:\s*]*\*{0,2}Baja/gi)  || []).length;
  const penalty = alta * 2.5 + media * 1.2 + baja * 0.5;
  const score = Math.max(1, Math.min(10, Math.round(10 - penalty)));
  return { alta, media, baja, score, total: alta + media + baja };
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 8 ? "#16a34a" : score >= 5 ? "#f59e0b" : "#e53935";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: "rgba(0,0,0,0.55)", color: "white", backdropFilter: "blur(4px)" }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {score}/10
    </span>
  );
}

function PlaceholderThumb() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#c8c6ca" strokeWidth="1.5"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="#c8c6ca"/>
        <path d="m3 15 5-5 4 4 3-3 6 6" stroke="#c8c6ca" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

interface ModalProps {
  entry: AnalysisEntry;
  onClose: () => void;
}

function AnalysisModal({ entry, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,44,80,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "white", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start justify-between gap-4 shrink-0"
          style={{ borderColor: "var(--personal-border)" }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--personal-dark)" }}>
              {entry.filename || entry.figmaUrl || "Análisis"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--personal-gray)" }}>{timeAgo(entry.timestamp)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5 shrink-0">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Thumbnail */}
        {entry.thumbnail && (
          <div className="relative w-full shrink-0" style={{ height: "220px", background: "var(--personal-bg-bold)" }}>
            <Image src={entry.thumbnail} alt="Análisis" fill className="object-contain" unoptimized />
          </div>
        )}

        {/* Analysis */}
        <div className="p-6 overflow-y-auto flex-1">
          <StructuredResults content={entry.analysis} />
        </div>
      </div>
    </div>
  );
}

interface Props {
  entries: AnalysisEntry[];
}

export function HistorySection({ entries }: Props) {
  const [selected, setSelected] = useState<AnalysisEntry | null>(null);

  if (entries.length === 0) return null;

  return (
    <>
      <section className="mt-14">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-bold text-lg" style={{ color: "var(--personal-dark)" }}>Últimos análisis</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--personal-bg-bold)", color: "var(--personal-blue)" }}>
            {entries.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {entries.map((entry) => {
            const stats = quickStats(entry.analysis);
            return (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="rounded-2xl overflow-hidden border text-left transition-all hover:shadow-lg hover:-translate-y-0.5 duration-150 group"
                style={{ background: "var(--personal-white)", borderColor: "var(--personal-border)" }}
              >
                {/* Image area */}
                <div className="relative w-full" style={{ height: "160px", background: "var(--personal-bg-bold)" }}>
                  {entry.thumbnail
                    ? <Image src={entry.thumbnail} alt="Análisis" fill className="object-contain" unoptimized />
                    : <PlaceholderThumb />
                  }
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2.5 left-2.5">
                    {stats.total > 0 && <ScoreDot score={stats.score} />}
                  </div>
                  <span className="absolute top-2.5 right-2.5 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: entry.source === "figma" ? "rgba(0,118,199,0.85)" : "rgba(5,44,80,0.75)", color: "white" }}>
                    {entry.source === "figma" ? "Figma" : "IMG"}
                  </span>
                </div>

                {/* Card footer */}
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold truncate mb-0.5" style={{ color: "var(--personal-dark)" }}>
                    {entry.filename || entry.figmaUrl?.split("?")[0].split("/").pop() || "Pantalla"}
                  </p>
                  <p className="text-xs mb-2.5" style={{ color: "var(--personal-gray)" }}>{timeAgo(entry.timestamp)}</p>

                  {stats.total > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {stats.alta > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: "#ffebee", color: "#e53935" }}>
                          {stats.alta} Alta{stats.alta > 1 ? "s" : ""}
                        </span>
                      )}
                      {stats.media > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: "#fef3c7", color: "#b45309" }}>
                          {stats.media} Media{stats.media > 1 ? "s" : ""}
                        </span>
                      )}
                      {stats.baja > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: "#dcfce7", color: "#15803d" }}>
                          {stats.baja} Baja{stats.baja > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected && <AnalysisModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
