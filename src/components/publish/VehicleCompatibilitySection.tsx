import { VEHICLE_BRANDS } from "../../data/publicationOptions"
import type {
  PublicationFormData,
  SetPublicationField,
} from "../../types/publication"
import FormSection, { fieldClass } from "./FormSection"

type Props = {
  data: PublicationFormData
  setField: SetPublicationField
}

export default function VehicleCompatibilitySection({ data, setField }: Props) {
  const currentYear = new Date().getFullYear() + 1
  return (
    <FormSection
      number={2}
      title="Compatibilidad con vehículos"
      description="Ayuda a los compradores a confirmar si el repuesto sirve para su vehículo."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-petrol-dark">
          Marca
          <select
            value={data.vehicleBrand}
            onChange={(e) => setField("vehicleBrand", e.target.value)}
            className={fieldClass}
          >
            <option value="">Selecciona una marca</option>
            {VEHICLE_BRANDS.map((brand) => (
              <option key={brand}>{brand}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Modelo
          <input
            value={data.vehicleModel}
            onChange={(e) => setField("vehicleModel", e.target.value)}
            className={fieldClass}
            placeholder="Ej. Yaris"
          />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Versión o motorización
          <input
            value={data.version}
            onChange={(e) => setField("version", e.target.value)}
            className={fieldClass}
            placeholder="Ej. 1.5 GLI"
          />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Año desde
          <input
            type="number"
            min="1950"
            max={currentYear}
            value={data.yearFrom}
            onChange={(e) => setField("yearFrom", e.target.value)}
            className={fieldClass}
            placeholder="2016"
          />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Año hasta
          <input
            type="number"
            min="1950"
            max={currentYear}
            value={data.yearTo}
            onChange={(e) => setField("yearTo", e.target.value)}
            className={fieldClass}
            placeholder="2020"
          />
        </label>
        <label className="text-sm font-semibold text-petrol-dark">
          Código OEM <span className="font-normal text-muted">(opcional)</span>
          <input
            value={data.oemCode}
            onChange={(e) => setField("oemCode", e.target.value)}
            className={fieldClass}
            placeholder="Ej. 27060-0M040"
          />
        </label>
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl bg-bg p-4 text-sm font-medium text-petrol-dark">
        <input
          type="checkbox"
          checked={data.multipleVehicles}
          onChange={(e) => setField("multipleVehicles", e.target.checked)}
          className="h-4 w-4 accent-orange"
        />
        Es compatible con varios vehículos
      </label>
    </FormSection>
  )
}
