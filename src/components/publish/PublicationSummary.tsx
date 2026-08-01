import type { PublicationFormData } from "../../types/publication"

const CONDITION_LABELS = {
  new: "Nuevo",
  used: "Usado",
  refurbished: "Reacondicionado",
  "": "Sin seleccionar",
}

export default function PublicationSummary({
  data,
  imageCount,
}: {
  data: PublicationFormData
  imageCount: number
}) {
  const price = Number(data.price)
  const items = [
    ["Título", data.title || "Sin título"],
    ["Precio", price > 0 ? `$${price.toLocaleString("es-CL")}` : "$0"],
    ["Categoría", data.category || "Sin seleccionar"],
    ["Estado", CONDITION_LABELS[data.condition]],
    [
      "Ubicación",
      data.commune && data.region
        ? `${data.commune}, ${data.region}`
        : "Sin seleccionar",
    ],
    ["Imágenes", `${imageCount} de 8`],
  ]
  return (
    <section className="rounded-2xl bg-petrol-dark p-6 text-white sm:p-7">
      <h2 className="font-display text-xl font-bold">
        Resumen de la publicación
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Revisa la información principal antes de publicar.
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs text-white/60">{label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
