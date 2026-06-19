"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";

interface Finding {
  severity: "Alta" | "Media" | "Baja";
  location?: string;
  problem?: string;
  recommendation?: string;
  needsValidation?: boolean;
  dimension?: string;
}

interface ParsedAnalysis {
  summary: string;
  findings: Finding[];
  score: number;
  hasDimensions: boolean;
  dimensionCounts: Record<string, number>;
}

const SEVERITY_CONFIG = {
  Alta:  { bg: "#fff0f0", border: "#e53935", badge: "#e53935", badgeBg: "#ffebee", label: "Alta" },
  Media: { bg: "#fffbf0", border: "#f59e0b", badge: "#b45309", badgeBg: "#fef3c7", label: "Media" },
  Baja:  { bg: "#f0fff4", border: "#16a34a", badge: "#15803d", badgeBg: "#dcfce7", label: "Baja" },
};

const DIMENSIONS = ["Contenido", "Consistencia", "Reglas", "Huecos", "Voz/tono", "Formato"];

function stripMd(s: string) {
  return s.replace(/\*+/g, "").replace(/`/g, "").trim();
}

function parseAnalysis(raw: string): ParsedAnalysis {
  const lines = raw.split("\n");
  let summary = "";
  let inSummary = false;
  let inFindings = false;
  const findings: Finding[] = [];
  let current: Partial<Finding> | null = null;
  const dimensionCounts: Record<string, number> = {};

  const flush = () => {
    if (current && current.severity) {
      findings.push(current as Finding);
      if (current.dimension) {
        dimensionCounts[current.dimension] = (dimensionCounts[current.dimension] || 0) + 1;
      }
    }
    current = null;
  };

  for (const line of lines) {
    const t = line.trim();

    if (/^#{1,3}\s*Resumen ejecutivo/i.test(t)) { inSummary = true; inFindings = false; continue; }
    if (/^#{1,3}\s*Hallazgos/i.test(t)) { flush(); inSummary = false; inFindings = true; continue; }
    if (/^#{1,3}/.test(t) && t.length > 3) { inSummary = false; }

    if (inSummary && t && !t.startsWith("#")) {
      summary += (summary ? " " : "") + stripMd(t);
    }

    if (inFindings) {
      const sevMatch = t.match(/Severidad[:\s*]*\*{0,2}(Alta|Media|Baja)/i);
      if (sevMatch) {
        flush();
        current = { severity: sevMatch[1] as Finding["severity"] };
        continue;
      }
      if (!current) continue;

      const locMatch = t.match(/Ubicaci[oó]n[:\*\s]+(.+)/i);
      if (locMatch) { current.location = stripMd(locMatch[1]); continue; }

      const probMatch = t.match(/Problema[:\*\s]+(.+)/i);
      if (probMatch) { current.problem = stripMd(probMatch[1]); continue; }

      const recMatch = t.match(/Recomendaci[oó]n[:\*\s]+(.+)/i);
      if (recMatch) { current.recommendation = stripMd(recMatch[1]); continue; }

      const valMatch = t.match(/validaci[oó]n[^:]*:?\s*\*{0,2}(Sí|Si|No)\*{0,2}/i);
      if (valMatch) { current.needsValidation = /s[íi]/i.test(valMatch[1]); continue; }

      const dimMatch = t.match(/Dimensi[oó]n[:\*\s]+(.+)/i);
      if (dimMatch) { current.dimension = stripMd(dimMatch[1]); }
    }
  }
  flush();

  const altaCount  = findings.filter(f => f.severity === "Alta").length;
  const mediaCount = findings.filter(f => f.severity === "Media").length;
  const bajaCount  = findings.filter(f => f.severity === "Baja").length;
  const penalty    = altaCount * 2.5 + mediaCount * 1.2 + bajaCount * 0.5;
  const score      = Math.max(1, Math.min(10, Math.round(10 - penalty)));

  return {
    summary,
    findings,
    score,
    hasDimensions: Object.keys(dimensionCounts).length > 0,
    dimensionCounts,
  };
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 8 ? "var(--personal-success)" : score >= 5 ? "#f59e0b" : "var(--personal-error)";
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (score / 10) * circ;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" stroke="var(--personal-bg-bold)" />
          <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" stroke={color}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--personal-gray)" }}>Score global</p>
        <p className="text-sm font-bold" style={{ color }}>
          {score >= 8 ? "Bueno" : score >= 5 ? "Mejorable" : "Crítico"}
        </p>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Finding["severity"] }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.badgeBg, color: cfg.badge }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.badge }} />
      {cfg.label}
    </span>
  );
}

function ValidationBadge({ needs }: { needs: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={needs
        ? { background: "var(--personal-warning-soft)", color: "#92400e" }
        : { background: "var(--personal-success-soft)", color: "var(--personal-success)" }
      }>
      {needs ? "⚠ Requiere validación" : "✓ Sin validación"}
    </span>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const cfg = SEVERITY_CONFIG[finding.severity];
  return (
    <div className="rounded-xl overflow-hidden border"
      style={{ background: cfg.bg, borderColor: cfg.border + "44" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: cfg.border + "33" }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: cfg.border }}>
          {index + 1}
        </div>
        <SeverityBadge severity={finding.severity} />
        {finding.dimension && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--personal-blue-xsoft)", color: "var(--personal-blue)" }}>
            {finding.dimension}
          </span>
        )}
        {finding.needsValidation !== undefined && (
          <div className="ml-auto">
            <ValidationBadge needs={finding.needsValidation} />
          </div>
        )}
      </div>
      <div className="px-4 py-3 grid gap-2">
        {finding.location && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--personal-gray)" }}>Ubicación</p>
            <p className="text-sm" style={{ color: "var(--personal-dark)" }}>{finding.location}</p>
          </div>
        )}
        {finding.problem && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--personal-gray)" }}>Problema</p>
            <p className="text-sm" style={{ color: "var(--personal-dark)" }}>{finding.problem}</p>
          </div>
        )}
        {finding.recommendation && (
          <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${cfg.border}22` }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: cfg.badge }}>Recomendación</p>
            <p className="text-sm font-medium" style={{ color: "var(--personal-dark)" }}>{finding.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function StructuredResults({ content }: { content: string }) {
  const parsed = parseAnalysis(content);

  if (parsed.findings.length === 0) {
    return <MarkdownRenderer content={content} />;
  }

  const altaCount  = parsed.findings.filter(f => f.severity === "Alta").length;
  const mediaCount = parsed.findings.filter(f => f.severity === "Media").length;
  const bajaCount  = parsed.findings.filter(f => f.severity === "Baja").length;

  return (
    <div className="space-y-5">
      {/* Score + summary */}
      <div className="rounded-xl p-4 border" style={{ background: "var(--personal-bg)", borderColor: "var(--personal-border)" }}>
        <div className="flex items-start gap-4">
          <ScoreRing score={parsed.score} />
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-2">
              {altaCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#ffebee", color: "#e53935" }}>
                  {altaCount} Alta{altaCount > 1 ? "s" : ""}
                </span>
              )}
              {mediaCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef3c7", color: "#b45309" }}>
                  {mediaCount} Media{mediaCount > 1 ? "s" : ""}
                </span>
              )}
              {bajaCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#dcfce7", color: "#15803d" }}>
                  {bajaCount} Baja{bajaCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {parsed.summary && (
              <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{parsed.summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dimension pills with counts */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--personal-gray)" }}>
          Dimensiones analizadas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIMENSIONS.map((d) => {
            const count = parsed.dimensionCounts[d] || 0;
            return (
              <span key={d} className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  background: count > 0 ? "var(--personal-blue-xsoft)" : "var(--personal-bg-bold)",
                  color: count > 0 ? "var(--personal-blue)" : "var(--personal-gray)",
                  border: count > 0 ? "1px solid var(--personal-blue-soft)" : "1px solid transparent",
                }}>
                {d}
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--personal-blue)", color: "white", fontSize: "10px" }}>
                    {count}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Finding cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--personal-gray)" }}>
          Hallazgos · {parsed.findings.length}
        </p>
        <div className="space-y-3">
          {parsed.findings.map((f, i) => (
            <FindingCard key={i} finding={f} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
