import { supabase } from "../lib/supabase"
import type {
  ListingQuestion,
  ListingQuestionAnswererIdentityType,
  ListingQuestionPagination,
  ListingQuestionsPage,
} from "../types/listingQuestion"

type ListingQuestionRow = {
  question_id: string
  question: string
  created_at: string
  updated_at: string
  asker_display_name: string
  asker_avatar_path: string | null
  answer: string | null
  answered_at: string | null
  answer_updated_at: string | null
  answerer_identity_type: ListingQuestionAnswererIdentityType | null
  answerer_display_name: string | null
  answerer_avatar_path: string | null
  total_count: number | string
}

type RpcError = {
  code?: string
  message: string
}

export class ListingQuestionServiceError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "ListingQuestionServiceError"
    this.code = code
  }
}

function throwQuestionError(
  context: string,
  fallbackMessage: string,
  error: RpcError,
): never {
  if (import.meta.env.DEV)
    console.error(context, { code: error.code, message: error.message })

  const detail = error.message.toLocaleLowerCase("es-CL")
  let message = fallbackMessage

  if (detail.includes("cooldown"))
    message = "Espera un minuto antes de hacer otra pregunta."
  else if (detail.includes("unanswered question limit"))
    message = "Ya tienes cinco preguntas sin responder en esta publicación."
  else if (detail.includes("between 5 and 1000"))
    message = "La pregunta debe tener entre 5 y 1000 caracteres."
  else if (detail.includes("between 1 and 2000"))
    message = "La respuesta debe tener entre 1 y 2000 caracteres."
  else if (detail.includes("own listing"))
    message = "No puedes preguntar en tu propia publicación."
  else if (detail.includes("not available for questions"))
    message = "Esta publicación no está disponible para recibir preguntas."
  else if (detail.includes("already answered"))
    message = "Esta pregunta ya fue respondida."
  else if (
    error.code === "42501" ||
    detail.includes("authentication") ||
    detail.includes("only the listing seller")
  )
    message = "No tienes permiso para realizar esta acción."

  throw new ListingQuestionServiceError(message, error.code)
}

function mapQuestion(row: ListingQuestionRow): ListingQuestion {
  return {
    id: row.question_id,
    question: row.question,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    askerDisplayName: row.asker_display_name,
    askerAvatarPath: row.asker_avatar_path,
    answer: row.answer,
    answeredAt: row.answered_at,
    answerUpdatedAt: row.answer_updated_at,
    answererIdentityType: row.answerer_identity_type,
    answererDisplayName: row.answerer_display_name,
    answererAvatarPath: row.answerer_avatar_path,
  }
}

export async function getListingQuestions(
  listingId: string,
  pagination: ListingQuestionPagination = {},
): Promise<ListingQuestionsPage> {
  const { data, error } = await supabase.rpc("get_listing_questions", {
    p_listing_id: listingId,
    p_limit: pagination.limit ?? 10,
    p_offset: pagination.offset ?? 0,
  })

  if (error)
    throwQuestionError(
      "No se pudieron cargar las preguntas.",
      "No pudimos cargar las preguntas de esta publicación.",
      error,
    )

  const rows = (data ?? []) as ListingQuestionRow[]
  return {
    questions: rows.map(mapQuestion),
    totalCount: rows.length > 0 ? Number(rows[0].total_count) : 0,
  }
}

export async function createListingQuestion(
  listingId: string,
  question: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_listing_question", {
    p_listing_id: listingId,
    p_question: question,
  })

  if (error)
    throwQuestionError(
      "No se pudo crear la pregunta.",
      "No pudimos publicar tu pregunta.",
      error,
    )

  return data as string
}

export async function answerListingQuestion(
  questionId: string,
  answer: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("answer_listing_question", {
    p_question_id: questionId,
    p_answer: answer,
  })

  if (error)
    throwQuestionError(
      "No se pudo responder la pregunta.",
      "No pudimos publicar tu respuesta.",
      error,
    )

  return data as string
}
