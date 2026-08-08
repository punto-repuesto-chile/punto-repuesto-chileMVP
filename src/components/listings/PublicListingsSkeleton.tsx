export default function PublicListingsSkeleton({
  count = 4,
}: {
  count?: number
}) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Cargando publicaciones"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-2xl border border-border bg-white"
        >
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-4/5 rounded bg-slate-200" />
            <div className="h-3 w-3/5 rounded bg-slate-100" />
            <div className="h-3 w-2/5 rounded bg-slate-100" />
            <div className="h-5 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
