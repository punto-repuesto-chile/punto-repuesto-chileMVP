export default function MyListingsSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-label="Cargando publicaciones"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-2xl border border-border bg-white"
        >
          <div className="grid sm:grid-cols-[220px_1fr]">
            <div className="h-48 bg-slate-200 sm:h-56" />
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex justify-between gap-4">
                <div className="h-6 w-2/3 rounded bg-slate-200" />
                <div className="h-6 w-24 rounded bg-slate-200" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((detail) => (
                  <div key={detail} className="space-y-2">
                    <div className="h-3 w-12 rounded bg-slate-100" />
                    <div className="h-4 w-20 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
              <div className="h-9 w-48 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
