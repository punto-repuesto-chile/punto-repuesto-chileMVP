type PageItem = number | "ellipsis-start" | "ellipsis-end"

function pageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages])
  for (
    let page = Math.max(2, currentPage - 2);
    page <= Math.min(totalPages - 1, currentPage + 2);
    page += 1
  )
    pages.add(page)

  const sortedPages = [...pages].sort((first, second) => first - second)
  const items: PageItem[] = []
  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1]
    if (previous && page - previous > 1)
      items.push(previous === 1 ? "ellipsis-start" : "ellipsis-end")
    items.push(page)
  })
  return items
}

export default function PublicListingsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const buttonClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <nav
      aria-label="Paginación de publicaciones"
      className="mt-8 border-t border-border pt-6"
    >
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${buttonClass} border-border bg-white text-petrol-dark`}
        >
          Anterior
        </button>
        <span className="text-sm font-semibold text-muted">
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${buttonClass} border-border bg-white text-petrol-dark`}
        >
          Siguiente
        </button>
      </div>

      <div className="hidden items-center justify-center gap-2 sm:flex">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${buttonClass} border-border bg-white text-petrol-dark hover:border-petrol`}
        >
          Anterior
        </button>
        {pageItems(currentPage, totalPages).map((item) =>
          typeof item === "number" ? (
            <button
              type="button"
              key={item}
              aria-current={item === currentPage ? "page" : undefined}
              aria-label={`Ir a la página ${item}`}
              onClick={() => onPageChange(item)}
              className={`${buttonClass} ${
                item === currentPage
                  ? "border-petrol bg-petrol text-white shadow-sm"
                  : "border-border bg-white text-petrol-dark hover:border-orange hover:text-orange-dark"
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="px-1 text-muted" aria-hidden="true">
              …
            </span>
          ),
        )}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${buttonClass} border-border bg-white text-petrol-dark hover:border-petrol`}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
