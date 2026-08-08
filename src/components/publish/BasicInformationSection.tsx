import { LISTING_CATEGORIES } from "../../constants/listingCategories"
import type {
  PublicationErrors,
  PublicationFormData,
  SetPublicationField,
} from "../../types/publication"
import FormSection, { FieldError, fieldClass } from "./FormSection"

type Props = {
  data: PublicationFormData
  errors: PublicationErrors
  setField: SetPublicationField
}

export default function BasicInformationSection({
  data,
  errors,
  setField,
}: Props) {
  return (
    <FormSection
      number={1}
      title="Información principal"
      description="Describe el repuesto con datos claros para que sea fácil encontrarlo."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-semibold text-petrol-dark">
          Título de la publicación *
          <input
            id="title"
            value={data.title}
            onChange={(e) => setField("title", e.target.value)}
            className={fieldClass}
            placeholder="Ej. Alternador Hyundai Accent 2017"
            aria-invalid={Boolean(errors.title)}
          />
          <FieldError message={errors.title} />
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-petrol-dark">
          Descripción *
          <textarea
            id="description"
            value={data.description}
            onChange={(e) => setField("description", e.target.value)}
            className={`${fieldClass} min-h-32 resize-y`}
            placeholder="Indica estado, procedencia, detalles y cualquier información útil."
            aria-invalid={Boolean(errors.description)}
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <FieldError message={errors.description} />
            <span>{data.description.length} caracteres</span>
          </div>
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Categoría *
          <select
            id="category"
            value={data.category}
            onChange={(e) => setField("category", e.target.value)}
            className={fieldClass}
          >
            <option value="">Selecciona una categoría</option>
            {LISTING_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.category} />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Estado *
          <select
            id="condition"
            value={data.condition}
            onChange={(e) =>
              setField(
                "condition",
                e.target.value as PublicationFormData["condition"],
              )
            }
            className={fieldClass}
          >
            <option value="">Selecciona el estado</option>
            <option value="new">Nuevo</option>
            <option value="used">Usado</option>
            <option value="refurbished">Reacondicionado</option>
          </select>
          <FieldError message={errors.condition} />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Precio (CLP) *
          <input
            id="price"
            type="number"
            min="1"
            value={data.price}
            onChange={(e) => setField("price", e.target.value)}
            className={fieldClass}
            placeholder="48000"
          />
          <FieldError message={errors.price} />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Cantidad disponible *
          <input
            id="quantity"
            type="number"
            min="1"
            value={data.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
            className={fieldClass}
          />
          <FieldError message={errors.quantity} />
        </label>
      </div>
    </FormSection>
  )
}
