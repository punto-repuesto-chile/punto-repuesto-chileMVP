import type {
  PublicationErrors,
  PublicationFormData,
  PublicationImagePreview,
  SetPublicationField,
} from "../../types/publication"
import BasicInformationSection from "./BasicInformationSection"
import LocationDeliverySection from "./LocationDeliverySection"
import ProductImagesSection from "./ProductImagesSection"
import PublicationSummary from "./PublicationSummary"
import SellerContactSection from "./SellerContactSection"
import VehicleCompatibilitySection from "./VehicleCompatibilitySection"

export default function PublicationFormFields({
  data,
  images,
  errors,
  setField,
  addFiles,
  removeImage,
  setPrimary,
  disableEmail = false,
}: {
  data: PublicationFormData
  images: PublicationImagePreview[]
  errors: PublicationErrors
  setField: SetPublicationField
  addFiles: (files: File[]) => void
  removeImage: (id: string) => void
  setPrimary: (id: string) => void
  disableEmail?: boolean
}) {
  return (
    <>
      <BasicInformationSection
        data={data}
        errors={errors}
        setField={setField}
      />
      <VehicleCompatibilitySection data={data} setField={setField} />
      <div id="images">
        <ProductImagesSection
          images={images}
          error={errors.images}
          addFiles={addFiles}
          removeImage={removeImage}
          setPrimary={setPrimary}
        />
      </div>
      <div id="delivery">
        <LocationDeliverySection
          data={data}
          errors={errors}
          setField={setField}
        />
      </div>
      <SellerContactSection
        data={data}
        errors={errors}
        setField={setField}
        disableEmail={disableEmail}
      />
      <PublicationSummary data={data} imageCount={images.length} />
    </>
  )
}
