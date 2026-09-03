import { supabase } from "../lib/supabase"
import type { CreateReportInput } from "../types/report"

type RpcError = {
  code?: string
  message: string
}

export class ReportServiceError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "ReportServiceError"
    this.code = code
  }
}

function throwReportError(error: RpcError): never {
  if (import.meta.env.DEV)
    console.error("No se pudo crear el reporte.", {
      code: error.code,
      message: error.message,
    })

  const detail = error.message.toLocaleLowerCase("es-CL")
  let message = "No pudimos enviar tu reporte. Inténtalo nuevamente."

  if (detail.includes("already exists"))
    message = "Ya reportaste este contenido."
  else if (detail.includes("cooldown"))
    message = "Espera un momento antes de enviar otro reporte."
  else if (detail.includes("daily limit"))
    message = "Has alcanzado el límite de reportes por hoy."
  else if (detail.includes("own content"))
    message = "No puedes reportar tu propio contenido."
  else if (detail.includes("target is not available"))
    message = "Este contenido ya no está disponible para reportar."
  else if (detail.includes("details cannot be blank"))
    message = "Los detalles no pueden estar vacíos."
  else if (detail.includes("cannot exceed 1500"))
    message = "Los detalles no pueden superar los 1500 caracteres."
  else if (detail.includes("at least 10"))
    message = "Describe el motivo usando al menos 10 caracteres."
  else if (error.code === "22023" || detail.includes("invalid report"))
    message = "Revisa el motivo y los detalles del reporte."
  else if (error.code === "42501" || detail.includes("authentication"))
    message = "Debes iniciar sesión para reportar contenido."

  throw new ReportServiceError(message, error.code)
}

export async function createReport(input: CreateReportInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_report", {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_details: input.details ?? null,
    p_target_part: input.targetPart ?? "content",
  })

  if (error) throwReportError(error)

  return data as string
}
