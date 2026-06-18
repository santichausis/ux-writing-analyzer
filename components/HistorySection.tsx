"use client";

import { useState } from "react";
import Image from "next/image";
import type { AnalysisEntry } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hace un momento";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

function PlaceholderThumb() {
  return (
    <div className="flex items-center justify-center h-full">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9ca3af" strokeWidth="1.5"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="#9ca3af"/>
        <path d="m3 15 5-5 4 4 3-3 6 6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
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
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        style={{ background: "white", maxHeight: "90vh" }}>
        <div className="md:w-48 flex-shrink-0 relative min-h-40" style={{ background: "var(--personal-bg-bold)" }}>
          {entry.thumbnail
            ? <Image src={entry.thumbnail} alt="Análisis" fill className="object-cover" unoptimized />
            : <PlaceholderThumb />
          }
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-start justify-between gap-4" style={{ borderColor: "var(--personal-border)" }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--personal-dark)" }}>
                {entry.filename || entry.figmaUrl || "Análisis"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--personal-gray)" }}>{timeAgo(entry.timestamp)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <MarkdownRenderer content={entry.analysis} />
          </div>
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
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--personal-bg-bold)", color: "var(--personal-blue)" }}>
            {entries.length}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {entries.map((entry) => (
            <button key={entry.id} onClick={() => setSelected(entry)}
              className="rounded-xl overflow-hidden border text-left transition-all hover:shadow-md hover:-translate-y-0.5 duration-150"
              style={{ background: "var(--personal-white)", borderColor: "var(--personal-border)" }}
            >
              <div className="relative w-full h-28" style={{ background: "var(--personal-bg-bold)" }}>
                {entry.thumbnail
                  ? <Image src={entry.thumbnail} alt="Análisis" fill className="object-cover" unoptimized />
                  : <PlaceholderThumb />
                }
                <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: entry.source === "figma" ? "rgba(0,118,199,0.85)" : "rgba(5,44,80,0.7)", color: "white" }}>
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

      {selected && <AnalysisModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
