import { Link, useNavigate } from "react-router-dom"

export default function PublishHeader({
  label = "Publicando",
}: {
  label?: string
}) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-petrol-dark hover:bg-bg"
        >
          ← Volver
        </button>
        <Link to="/" className="flex items-center" aria-label="Ir al inicio">
          <img
            src="/brand/logo-horizontal.png"
            alt="Punto Repuesto Chile"
            className="h-9 w-auto max-w-[180px] object-contain"
          />
        </Link>
        <span className="rounded-full bg-orange/10 px-3 py-1.5 text-xs font-bold text-orange-dark">
          {label}
        </span>
      </div>
    </header>
  )
}
