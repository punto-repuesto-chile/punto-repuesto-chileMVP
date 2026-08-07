import { Link } from "react-router-dom"

export default function MyListingsEmptyState({
  filtered = false,
}: {
  filtered?: boolean
}) {
  if (filtered)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
        <p className="font-display text-lg font-bold text-petrol-dark">
          No hay publicaciones en este estado
        </p>
        <p className="mt-2 text-sm text-muted">
          Prueba seleccionando otro filtro para revisar tus publicaciones.
        </p>
      </div>
    )

  return (
    <div className="rounded-3xl border border-border bg-white px-6 py-14 text-center shadow-sm sm:px-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange/10 text-3xl text-orange">
        +
      </div>
      <h2 className="mt-5 font-display text-2xl font-extrabold text-petrol-dark">
        No tienes publicaciones todavía
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
        Publica tu primer repuesto para comenzar a conectar con compradores de
        todo Chile.
      </p>
      <Link
        to="/publicar"
        className="mt-6 inline-flex rounded-xl bg-orange px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-dark"
      >
        Publicar mi primer producto
      </Link>
    </div>
  )
}
