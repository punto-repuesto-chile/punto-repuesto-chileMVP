export default function ListingDetailSkeleton() {
  return (
    <div
      className="grid animate-pulse gap-7 lg:grid-cols-[1.15fr_0.85fr]"
      aria-label="Cargando publicación"
      aria-busy="true"
    >
      <div>
        <div className="aspect-[4/3] rounded-2xl bg-slate-200" />
        <div className="mt-3 flex gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 w-24 rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="h-6 w-24 rounded-full bg-slate-200" />
        <div className="mt-6 h-4 w-32 rounded bg-slate-100" />
        <div className="mt-3 h-10 w-5/6 rounded bg-slate-200" />
        <div className="mt-5 h-9 w-40 rounded bg-slate-200" />
        <div className="mt-7 h-28 rounded-xl bg-slate-100" />
        <div className="mt-7 h-32 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}
