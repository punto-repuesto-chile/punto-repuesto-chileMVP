import { Link } from "react-router-dom"

import type { SalvageYard } from "../../types/salvageYard"

export default function PublicationIdentitySelector({
  salvageYard,
  selectedSalvageYardId,
  isLoading,
  onChange,
}: {
  salvageYard: SalvageYard | null
  selectedSalvageYardId: string | null
  isLoading: boolean
  onChange: (salvageYardId: string | null) => void
}) {
  const isActive = salvageYard?.status === "active"

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-orange">
        Identidad de publicación
      </p>
      <h2 className="mt-1 font-display text-xl font-extrabold">
        Publicar como
      </h2>
      {isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-border p-4 transition has-[:checked]:border-petrol has-[:checked]:bg-petrol/5">
            <input
              type="radio"
              name="publication-identity"
              checked={selectedSalvageYardId === null}
              onChange={() => onChange(null)}
              className="mt-1 accent-petrol"
            />
            <span>
              <span className="block text-sm font-bold">Particular</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Esta publicación aparecerá asociada a tu perfil personal.
              </span>
            </span>
          </label>
          {salvageYard && (
            <label
              className={`flex gap-3 rounded-xl border p-4 ${
                isActive
                  ? "cursor-pointer border-border transition has-[:checked]:border-orange has-[:checked]:bg-orange/5"
                  : "cursor-not-allowed border-amber-200 bg-amber-50"
              }`}
            >
              <input
                type="radio"
                name="publication-identity"
                disabled={!isActive}
                checked={selectedSalvageYardId === salvageYard.id}
                onChange={() => onChange(salvageYard.id)}
                className="mt-1 accent-orange disabled:cursor-not-allowed"
              />
              <span>
                <span className="block text-sm font-bold">
                  {salvageYard.businessName}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  {isActive
                    ? `Esta publicación aparecerá en el inventario de ${salvageYard.businessName}.`
                    : "Activa tu desarmaduría para publicar comercialmente."}
                </span>
                {!isActive && (
                  <Link
                    to="/mi-desarmaduria"
                    className="mt-2 inline-flex text-xs font-bold text-petrol underline underline-offset-2"
                  >
                    Ir a mi desarmaduría
                  </Link>
                )}
              </span>
            </label>
          )}
        </div>
      )}
    </section>
  )
}
