export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--personal-bg)" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 animate-spin"
          style={{ borderColor: "var(--personal-border)", borderTopColor: "var(--personal-blue)" }} />
        <p className="text-sm" style={{ color: "var(--personal-gray)" }}>Cargando...</p>
      </div>
    </div>
  );
}
