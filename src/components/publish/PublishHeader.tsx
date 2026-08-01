import { Link, useNavigate } from "react-router-dom"

export default function PublishHeader() {
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
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="Ir al inicio"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-petrol text-xs font-bold text-white">
            PR
          </span>
          <span className="hidden font-display text-sm font-bold text-petrol-dark sm:block">
            Punto Repuesto <span className="text-orange">Chile</span>
          </span>
        </Link>
        <span className="rounded-full bg-orange/10 px-3 py-1.5 text-xs font-bold text-orange-dark">
          Publicando
        </span>
      </div>
    </header>
  )
}
