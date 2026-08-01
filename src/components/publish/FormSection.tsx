import type { ReactNode } from "react"

type Props = {
  number: number
  title: string
  description: string
  children: ReactNode
}

export default function FormSection({
  number,
  title,
  description,
  children,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-petrol-dark">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm text-petrol-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"

export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
  ) : null
}
