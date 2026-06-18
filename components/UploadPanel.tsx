"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Tab } from "@/lib/types";

interface Props {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  // image tab
  preview: string | null;
  image: File | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (file: File) => void;
  onClear: () => void;
  // figma tab
  figmaUrl: string;
  figmaToken: string;
  onFigmaUrlChange: (v: string) => void;
  onFigmaTokenChange: (v: string) => void;
  // shared
  isLoading: boolean;
  onAnalyze: () => void;
}

export function UploadPanel({
  tab, onTabChange,
  preview, image, isDragging, onDragOver, onDragLeave, onDrop, onFileChange, onClear,
  figmaUrl, figmaToken, onFigmaUrlChange, onFigmaTokenChange,
  isLoading, onAnalyze,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAnalyze = tab === "image" ? !!image : !!figmaUrl;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: "var(--personal-white)", borderColor: "var(--personal-border)" }}>
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--personal-border)" }}>
        {(["image", "figma"] as Tab[]).map((t) => (
          <button key={t} onClick={() => onTabChange(t)}
            className="flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              color: tab === t ? "var(--personal-blue)" : "var(--personal-gray)",
              borderBottom: tab === t ? "2px solid var(--personal-blue)" : "2px solid transparent",
              background: "transparent",
            }}
          >
            {t === "image" ? (
              <>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                  <path d="m3 15 5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Subir imagen
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 38 57" fill="none">
                  <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5Z" fill="currentColor"/>
                  <path d="M9.5 57A9.5 9.5 0 0 1 9.5 38H19V57Z" fill="currentColor" opacity=".6"/>
                  <path d="M0 19A9.5 9.5 0 0 1 9.5 9.5H19V28.5H9.5A9.5 9.5 0 0 1 0 19Z" fill="currentColor" opacity=".6"/>
                  <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19V19H9.5A9.5 9.5 0 0 1 0 9.5Z" fill="currentColor" opacity=".4"/>
                  <path d="M19 0H28.5A9.5 9.5 0 0 1 28.5 19H19Z" fill="currentColor" opacity=".4"/>
                </svg>
                Link de Figma
              </>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "image" && (
          <>
            <p className="text-xs mb-4" style={{ color: "var(--personal-gray)" }}>PNG, JPG o WEBP — máx. 10 MB</p>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-52 select-none"
              style={{
                borderColor: isDragging ? "var(--personal-blue-mid)" : "var(--personal-border)",
                background: isDragging ? "var(--personal-blue-xsoft)" : "var(--personal-bg)",
              }}
            >
              {preview ? (
                <div className="relative w-full h-52">
                  <Image src={preview} alt="Preview" fill className="object-contain rounded-lg" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--personal-bg-bold)" }}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path d="M12 16V8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" stroke="#0076c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--personal-blue)" }}>Arrastrá una imagen aquí</p>
                    <p className="text-xs mt-1" style={{ color: "var(--personal-gray)" }}>o hacé clic para seleccionarla</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])} />
            </div>
            {image && <p className="text-xs mt-2 truncate" style={{ color: "var(--personal-gray)" }}>{image.name}</p>}
          </>
        )}

        {tab === "figma" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--personal-dark)" }}>
                URL del frame o pantalla
              </label>
              <input type="url" placeholder="https://www.figma.com/file/…?node-id=118:10566"
                value={figmaUrl} onChange={(e) => onFigmaUrlChange(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ border: "1.5px solid var(--personal-border)", background: "var(--personal-bg)", color: "var(--personal-dark)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--personal-blue)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--personal-border)")}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--personal-gray)" }}>
                Botón derecho sobre el frame en Figma → &quot;Copy link&quot;
              </p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--personal-dark)" }}>
                Personal Access Token{" "}
                <span className="font-normal" style={{ color: "var(--personal-gray)" }}>(opcional)</span>
              </label>
              <input type="password" placeholder="figd_…"
                value={figmaToken} onChange={(e) => onFigmaTokenChange(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ border: "1.5px solid var(--personal-border)", background: "var(--personal-bg)", color: "var(--personal-dark)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--personal-blue)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--personal-border)")}
              />
            </div>
          </div>
        )}

        <button onClick={onAnalyze} disabled={!canAnalyze || isLoading}
          className="mt-5 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: canAnalyze && !isLoading
              ? "linear-gradient(90deg, var(--personal-blue) 0%, var(--personal-blue-mid) 100%)"
              : "var(--personal-bg-bold)",
            color: canAnalyze && !isLoading ? "white" : "var(--personal-gray)",
          }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Analizando...
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Analizar pantalla
            </>
          )}
        </button>

        {image && tab === "image" && (
          <button onClick={onClear} className="mt-2 w-full py-2 text-xs rounded-lg" style={{ color: "var(--personal-gray)" }}>
            Limpiar imagen
          </button>
        )}
      </div>
    </div>
  );
}
