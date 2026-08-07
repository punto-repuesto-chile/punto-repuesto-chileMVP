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
  disableEmail?: boolean
}

export default function SellerContactSection({
  data,
  errors,
  setField,
  disableEmail = false,
}: Props) {
  return (
    <FormSection
      number={5}
      title="Información de contacto"
      description="Estos datos permitirán que compradores interesados puedan contactarte."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-petrol-dark">
          Nombre del vendedor *
          <input
            id="sellerName"
            value={data.sellerName}
            onChange={(e) => setField("sellerName", e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
          <FieldError message={errors.sellerName} />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Teléfono chileno *
          <input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className={fieldClass}
            placeholder="+56 9 1234 5678"
            autoComplete="tel"
          />
          <FieldError message={errors.phone} />
        </label>
        <label className="sm:col-span-2 text-sm font-semibold text-petrol-dark">
          Correo electrónico
          <input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => setField("email", e.target.value)}
            className={fieldClass}
            placeholder="nombre@correo.cl"
            autoComplete="email"
            disabled={disableEmail}
          />
          <FieldError message={errors.email} />
        </label>
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
        <input
          type="checkbox"
          checked={data.whatsapp}
          onChange={(e) => setField("whatsapp", e.target.checked)}
          className="h-4 w-4 accent-green"
        />
        Permitir que me contacten por WhatsApp
      </label>
    </FormSection>
  )
}
