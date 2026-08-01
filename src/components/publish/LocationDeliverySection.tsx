import { CHILE_LOCATIONS } from "../../data/publicationOptions"
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

export default function LocationDeliverySection({
  data,
  errors,
  setField,
}: Props) {
  const communes = data.region ? (CHILE_LOCATIONS[data.region] ?? []) : []
  return (
    <FormSection
      number={4}
      title="Ubicación y entrega"
      description="Indica dónde está el producto y cómo puede recibirlo el comprador."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-petrol-dark">
          Región *
          <select
            id="region"
            value={data.region}
            onChange={(e) => {
              setField("region", e.target.value)
              setField("commune", "")
            }}
            className={fieldClass}
          >
            <option value="">Selecciona una región</option>
            {Object.keys(CHILE_LOCATIONS).map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
          <FieldError message={errors.region} />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Comuna *
          <select
            id="commune"
            value={data.commune}
            onChange={(e) => setField("commune", e.target.value)}
            className={fieldClass}
            disabled={!data.region}
          >
            <option value="">Selecciona una comuna</option>
            {communes.map((commune) => (
              <option key={commune}>{commune}</option>
            ))}
          </select>
          <FieldError message={errors.commune} />
        </label>
      </div>
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-petrol-dark">
          Opciones de entrega *
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["pickup", "Retiro presencial"],
            ["shipping", "Envío disponible"],
            ["deliveryAgreement", "Envío por acordar"],
          ].map(([field, label]) => (
            <label
              key={field}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 text-sm text-petrol-dark"
            >
              <input
                type="checkbox"
                checked={Boolean(data[(field as keyof PublicationFormData)])}
                onChange={(e) =>
                  setField(
                    field as "pickup" | "shipping" | "deliveryAgreement",
                    e.target.checked,
                  )
                }
                className="h-4 w-4 accent-orange"
              />
              {label}
            </label>
          ))}
        </div>
        <FieldError message={errors.delivery} />
      </fieldset>
    </FormSection>
  )
}
