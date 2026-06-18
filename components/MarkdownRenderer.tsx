"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-base font-bold mt-5 mb-2 pt-4 border-t first:border-t-0 first:mt-0 first:pt-0" style={{ color: "var(--personal-dark)", borderColor: "var(--personal-border)" }}>{children}</h1>
  ),
  h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-sm font-bold mt-5 mb-2 pt-4 border-t first:border-t-0 first:mt-0 first:pt-0" style={{ color: "var(--personal-dark)", borderColor: "var(--personal-border)" }}>{children}</h2>
  ),
  h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: "var(--personal-blue)" }}>{children}</h3>
  ),
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm leading-relaxed mb-2" style={{ color: "#374151" }}>{children}</p>
  ),
  strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" style={{ color: "var(--personal-dark)" }}>{children}</strong>
  ),
  ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="space-y-1 mb-3 pl-1">{children}</ul>
  ),
  li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="flex gap-2 text-sm leading-relaxed" style={{ color: "#374151" }}>
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--personal-blue)" }} />
      <span>{children}</span>
    </li>
  ),
  table: ({ children }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4 rounded-xl border" style={{ borderColor: "var(--personal-border)" }}>
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead style={{ background: "var(--personal-bg-bold)" }}>{children}</thead>
  ),
  th: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--personal-dark)" }}>{children}</th>
  ),
  td: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-2 border-t text-xs" style={{ borderColor: "var(--personal-border)", color: "#374151" }}>{children}</td>
  ),
  blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 pl-3 py-1 my-2 text-sm italic" style={{ borderColor: "var(--personal-blue-mid)", color: "var(--personal-gray)" }}>{children}</blockquote>
  ),
  code: ({ children }: React.HTMLAttributes<HTMLElement>) => (
    <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "var(--personal-bg-bold)", color: "var(--personal-blue)" }}>{children}</code>
  ),
  hr: () => <hr className="my-4" style={{ borderColor: "var(--personal-border)" }} />,
};

function preprocess(content: string): string {
  return content
    .replace(/[-*]\s*\**Severidad:\**\s*\**Alta\**/gi,   "- 🔴 **Severidad: Alta**")
    .replace(/[-*]\s*\**Severidad:\**\s*\**Media\**/gi,  "- 🟡 **Severidad: Media**")
    .replace(/[-*]\s*\**Severidad:\**\s*\**Baja\**/gi,   "- 🟢 **Severidad: Baja**")
    .replace(/[-*]\s*\**¿Requiere validación\?:\**\s*\**Sí\**/gi,  "- ⚠️ **¿Requiere validación?: Sí**")
    .replace(/[-*]\s*\**¿Requiere validación\?:\**\s*\**No\**/gi,   "- ✅ **¿Requiere validación?: No**");
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {preprocess(content)}
    </ReactMarkdown>
  );
}
