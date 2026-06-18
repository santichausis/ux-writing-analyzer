"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--personal-bg)" }}>
      <div className="rounded-2xl border p-8 max-w-md w-full text-center"
        style={{ background: "var(--personal-white)", borderColor: "var(--personal-border)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--personal-error-soft)" }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="var(--personal-error)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-bold text-base mb-2" style={{ color: "var(--personal-dark)" }}>Algo salió mal</h2>
        <p className="text-sm mb-6" style={{ color: "var(--personal-gray)" }}>{error.message}</p>
        <button onClick={reset}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
          style={{ background: "var(--personal-blue)" }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
