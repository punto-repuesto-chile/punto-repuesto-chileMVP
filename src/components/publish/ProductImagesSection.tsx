import { useRef, useState, type DragEvent } from "react"
import type {
  PublicationErrors,
  PublicationImagePreview,
} from "../../types/publication"
import FormSection, { FieldError } from "./FormSection"

type Props = {
  images: PublicationImagePreview[]
  error?: PublicationErrors["images"]
  addFiles: (files: File[]) => void
  removeImage: (id: string) => void
  setPrimary: (id: string) => void
}

export default function ProductImagesSection({
  images,
  error,
  addFiles,
  removeImage,
  setPrimary,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const receive = (files: FileList | null) =>
    files && addFiles(Array.from(files))
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    receive(event.dataTransfer.files)
  }
  return (
    <FormSection
      number={3}
      title="Imágenes del producto"
      description="Agrega hasta 8 imágenes. La primera será la principal y puedes cambiarla."
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => {
          receive(e.target.files)
          e.target.value = ""
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragging
            ? "border-orange bg-orange/5"
            : "border-border bg-bg hover:border-petrol/50"
        }`}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
          ↑
        </div>
        <p className="font-semibold text-petrol-dark">
          Arrastra tus imágenes aquí
        </p>
        <p className="mt-1 text-sm text-muted">
          o haz clic para seleccionarlas · PNG, JPG o WebP
        </p>
        <p className="mt-3 text-xs font-semibold text-petrol">
          {images.length}/8 imágenes
        </p>
      </div>
      <FieldError message={error} />
      {images.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <article
              key={image.id}
              className={`relative overflow-hidden rounded-xl border-2 bg-bg ${
                image.isPrimary ? "border-orange" : "border-transparent"
              }`}
            >
              <img
                src={image.previewUrl}
                alt="Vista previa del repuesto"
                className="aspect-square w-full object-cover"
              />
              {image.isPrimary && (
                <span className="absolute left-2 top-2 rounded-full bg-orange px-2 py-1 text-[10px] font-bold text-white">
                  Principal
                </span>
              )}
              <div className="grid grid-cols-2 gap-1 p-2">
                <button
                  type="button"
                  onClick={() => setPrimary(image.id)}
                  className="rounded-lg bg-white px-1 py-2 text-[10px] font-semibold text-petrol hover:bg-border"
                  disabled={image.isPrimary}
                >
                  Principal
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="rounded-lg bg-white px-1 py-2 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </FormSection>
  )
}
