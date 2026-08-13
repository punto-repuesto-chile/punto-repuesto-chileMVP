import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import PublicSalvageYardCard from "../components/salvage/PublicSalvageYardCard"
import { CHILE_LOCATIONS } from "../data/publicationOptions"
import { getPublicSalvageYards } from "../services/salvageYardService"
import type { PublicSalvageYard } from "../types/salvageYard"

export default function SalvageYardsPage() {
  const [params, setParams] = useSearchParams()
  const region = params.get("region") ?? ""
  const commune = params.get("commune") ?? ""
  const [yards, setYards] = useState<PublicSalvageYard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const communes = useMemo(() => CHILE_LOCATIONS[region] ?? [], [region])

  const load = () => {
    setLoading(true)
    setError(false)
    void getPublicSalvageYards({
      region: region || undefined,
      commune: commune || undefined,
    })
      .then(setYards)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [region, commune])

  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-petrol-dark sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="text-sm font-semibold text-petrol hover:text-orange"
        >
          ← Volver al inicio
        </Link>
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-orange">
            Red comercial
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            Desarmadurías
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Encuentra negocios activos y conoce su inventario público.
          </p>
        </div>
        <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2">
          <label className="text-xs font-bold">
            Región
            <select
              value={region}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                e.target.value
                  ? next.set("region", e.target.value)
                  : next.delete("region")
                next.delete("commune")
                setParams(next)
              }}
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Todas</option>
              {Object.keys(CHILE_LOCATIONS).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Comuna
            <select
              value={commune}
              disabled={!region}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                e.target.value
                  ? next.set("commune", e.target.value)
                  : next.delete("commune")
                setParams(next)
              }}
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
            >
              <option value="">Todas</option>
              {communes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-52 animate-pulse rounded-3xl border border-border bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-white p-10 text-center">
            <p className="font-semibold">
              No pudimos cargar las desarmadurías.
            </p>
            <button
              type="button"
              onClick={load}
              className="mt-5 rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : yards.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-border bg-white p-10 text-center">
            <p className="font-semibold">
              Aún no hay desarmadurías registradas.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {yards.map((yard) => (
              <PublicSalvageYardCard key={yard.id} yard={yard} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
