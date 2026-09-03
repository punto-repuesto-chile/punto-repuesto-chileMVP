import { useCallback, useEffect, useRef, useState } from "react"

import { useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"

import {
  answerListingQuestion,
  createListingQuestion,
  getListingQuestions,
} from "../../services/listingQuestionService"

import { getProfileAvatarPublicUrl } from "../../services/profileService"

import { getSalvageYardLogoPublicUrl } from "../../services/salvageYardService"
import ReportContentDialog from "../reports/ReportContentDialog"
import type {
  ListingQuestion,
  ListingQuestionAnswererIdentityType,
} from "../../types/listingQuestion"

const PAGE_SIZE = 10

function formatDate(value: string): string {
  const date = new Date(value)

  const diffInSeconds = Math.max(
    0,

    Math.floor((Date.now() - date.getTime()) / 1000),
  )

  if (diffInSeconds < 60) return "hace un momento"

  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`

  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",

    month: "short",

    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date)
}

function publicAvatarUrl(
  path: string | null,

  identityType: ListingQuestionAnswererIdentityType | null = "profile",
): string | null {
  if (!path) return null

  return identityType === "salvage_yard"
    ? getSalvageYardLogoPublicUrl(path)
    : getProfileAvatarPublicUrl(path)
}

function Avatar({
  name,

  path,

  identityType,
}: {
  name: string

  path: string | null

  identityType?: ListingQuestionAnswererIdentityType | null
}) {
  const imageUrl = publicAvatarUrl(path, identityType)

  const initial = name.trim().slice(0, 1).toUpperCase() || "?"

  return imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-petrol text-sm font-bold text-white"
    >
      {initial}
    </div>
  )
}

type ListingQuestionsSectionProps = {
  listingId: string

  sellerId: string
}

export default function ListingQuestionsSection({
  listingId,

  sellerId,
}: ListingQuestionsSectionProps) {
  const { user, isLoading: isAuthLoading } = useAuth()

  const location = useLocation()

  const navigate = useNavigate()

  const [questions, setQuestions] = useState<ListingQuestion[]>([])

  const [totalCount, setTotalCount] = useState(0)

  const [isLoading, setIsLoading] = useState(true)

  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)

  const [questionText, setQuestionText] = useState("")

  const [questionError, setQuestionError] = useState<string | null>(null)

  const [questionFeedback, setQuestionFeedback] = useState<string | null>(null)

  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false)

  const [answeringId, setAnsweringId] = useState<string | null>(null)

  const [answerText, setAnswerText] = useState("")

  const [answerError, setAnswerError] = useState<string | null>(null)

  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)

  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const answerInputRef = useRef<HTMLTextAreaElement>(null)

  const sectionRef = useRef<HTMLElement>(null)

  const isOwner = Boolean(user && user.id === sellerId)

  const loadQuestions = useCallback(
    async (append = false) => {
      if (append) setIsLoadingMore(true)
      else {
        setIsLoading(true)

        setLoadError(null)
      }

      try {
        const result = await getListingQuestions(listingId, {
          limit: PAGE_SIZE,

          offset: append ? questions.length : 0,
        })

        setQuestions((current) => {
          if (!append) return result.questions

          const existingIds = new Set(current.map((item) => item.id))

          return [
            ...current,

            ...result.questions.filter((item) => !existingIds.has(item.id)),
          ]
        })

        setTotalCount(result.totalCount)
      } catch (error) {
        if (!append) setLoadError("No pudimos cargar las preguntas.")
        else setQuestionFeedback(null)
      } finally {
        if (append) setIsLoadingMore(false)
        else setIsLoading(false)
      }
    },

    [listingId, questions.length],
  )

  useEffect(() => {
    setQuestions([])

    setTotalCount(0)

    void loadQuestions()
  }, [listingId])

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void loadQuestions()
    }

    window.addEventListener("focus", refreshOnFocus)

    document.addEventListener("visibilitychange", refreshOnFocus)

    return () => {
      window.removeEventListener("focus", refreshOnFocus)

      document.removeEventListener("visibilitychange", refreshOnFocus)
    }
  }, [loadQuestions])

  useEffect(() => {
    if (location.hash !== "#preguntas") return

    const frame = window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, isLoading])

  useEffect(() => {
    const questionId = new URLSearchParams(location.search).get("question")

    if (!questionId || !questions.some((item) => item.id === questionId)) return

    setHighlightedId(questionId)

    const timeout = window.setTimeout(() => setHighlightedId(null), 3500)

    return () => window.clearTimeout(timeout)
  }, [location.search, questions])

  const submitQuestion = async () => {
    const normalized = questionText.trim()

    if (!normalized) {
      setQuestionError("Escribe una pregunta antes de enviarla.")

      return
    }

    if (normalized.length < 5 || normalized.length > 1000) {
      setQuestionError("La pregunta debe tener entre 5 y 1000 caracteres.")

      return
    }

    setIsSubmittingQuestion(true)

    setQuestionError(null)

    setQuestionFeedback(null)

    try {
      await createListingQuestion(listingId, normalized)

      setQuestionText("")

      setQuestionFeedback("Pregunta publicada.")

      await loadQuestions()
    } catch (error) {
      setQuestionError(
        error instanceof Error
          ? error.message
          : "No pudimos publicar tu pregunta.",
      )
    } finally {
      setIsSubmittingQuestion(false)
    }
  }

  const submitAnswer = async () => {
    if (!answeringId) return

    const normalized = answerText.trim()

    if (!normalized) {
      setAnswerError("La respuesta no puede estar vacía.")

      return
    }

    if (normalized.length > 2000) {
      setAnswerError("La respuesta no puede superar los 2000 caracteres.")

      return
    }

    setIsSubmittingAnswer(true)

    setAnswerError(null)

    try {
      await answerListingQuestion(answeringId, normalized)

      setAnsweringId(null)

      setAnswerText("")

      await loadQuestions()
    } catch (error) {
      setAnswerError(
        error instanceof Error
          ? error.message
          : "No pudimos publicar tu respuesta.",
      )
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  const openLogin = () => {
    navigate("/login", {
      state: {
        from: `${location.pathname}${location.search}#preguntas`,
      },
    })
  }

  return (
    <section
      id="preguntas"
      ref={sectionRef}
      aria-labelledby="listing-questions-title"
      className="scroll-mt-24"
    >
      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange">
            Comunidad
          </p>
          <h2
            id="listing-questions-title"
            className="mt-1 font-display text-2xl font-extrabold"
          >
            Preguntas
          </h2>
          <p className="mt-2 text-sm text-muted">
            Resuelve tus dudas y ayuda a otros compradores.
          </p>
        </div>

        {!isAuthLoading && !isOwner && (
          <div className="mt-6 border-t border-border pt-6">
            {user ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()

                  void submitQuestion()
                }}
              >
                <label
                  htmlFor="listing-question-input"
                  className="text-sm font-semibold text-petrol-dark"
                >
                  ¿Qué quieres saber sobre este producto?
                </label>
                <textarea
                  id="listing-question-input"
                  value={questionText}
                  maxLength={1000}
                  onChange={(event) => {
                    setQuestionText(event.target.value)

                    setQuestionError(null)
                  }}
                  placeholder="¿Qué quieres saber sobre este producto?"
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-sm text-petrol-dark outline-none transition placeholder:text-muted/70 focus:border-orange focus:ring-2 focus:ring-orange/20"
                  aria-invalid={Boolean(questionError)}
                  aria-describedby={
                    questionError ? "question-error" : undefined
                  }
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted">
                    {questionText.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingQuestion}
                    className="rounded-xl bg-orange px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingQuestion ? "Publicando…" : "Preguntar"}
                  </button>
                </div>
                {questionError && (
                  <p
                    id="question-error"
                    role="alert"
                    className="mt-2 text-sm font-semibold text-red-700"
                  >
                    {questionError}
                  </p>
                )}
                {questionFeedback && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-2 text-sm font-semibold text-emerald-700"
                  >
                    {questionFeedback}
                  </p>
                )}
              </form>
            ) : (
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-bg p-4 sm:flex-row sm:items-center">
                <p className="text-sm font-semibold text-petrol-dark">
                  Inicia sesión para hacer una pregunta
                </p>
                <button
                  type="button"
                  onClick={openLogin}
                  className="rounded-xl border border-petrol px-4 py-2.5 text-sm font-bold text-petrol transition hover:bg-petrol/5"
                >
                  Iniciar sesión
                </button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div
            className="mt-6 space-y-4"
            aria-busy="true"
            aria-label="Cargando preguntas"
          >
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm">
            <p role="alert" className="font-semibold text-red-700">
              No pudimos cargar las preguntas.
            </p>
            <button
              type="button"
              onClick={() => void loadQuestions()}
              className="mt-3 rounded-lg border border-red-300 px-3 py-2 font-bold text-red-700 hover:bg-white"
            >
              Reintentar
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border px-5 py-8 text-center">
            <p className="font-semibold text-petrol-dark">
              Aún no hay preguntas.
            </p>
            <p className="mt-1 text-sm text-muted">
              {isOwner
                ? "Cuando un comprador tenga una duda, aparecerá aquí."
                : "Sé el primero en preguntar sobre esta publicación."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {questions.map((item) => {
              const isAnswerEditorOpen = answeringId === item.id

              const isHighlighted = highlightedId === item.id

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-5 transition sm:p-6 ${
                    isHighlighted
                      ? "border-orange bg-orange/5 ring-2 ring-orange/20"
                      : "border-border bg-white"
                  } relative`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={item.askerDisplayName}
                      path={item.askerAvatarPath}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-sm font-bold text-petrol-dark">
                          {item.askerDisplayName}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-petrol-dark">
                        {item.question}
                      </p>
                    </div>
                    <ReportContentDialog
                      targetType="listing_question"
                      targetId={item.id}
                      targetPart="question"
                      title="Reportar pregunta"
                    />
                  </div>

                  {item.answer ? (
                    <div className="mt-5 ml-3 border-l-2 border-orange/30 pl-4 sm:ml-12">
                      <div className="flex items-start gap-3">
                        <Avatar
                          name={item.answererDisplayName ?? "Vendedor"}
                          path={item.answererAvatarPath}
                          identityType={item.answererIdentityType}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <p className="text-sm font-bold text-petrol-dark">
                              Respuesta de{" "}
                              {item.answererDisplayName ?? "Vendedor"}
                            </p>
                            {item.answeredAt && (
                              <p className="text-xs text-muted">
                                {formatDate(item.answeredAt)}
                              </p>
                            )}
                          </div>
                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
                            {item.answer}
                          </p>
                        </div>
                        <ReportContentDialog
                          targetType="listing_question"
                          targetId={item.id}
                          targetPart="answer"
                          title="Reportar respuesta"
                        />
                      </div>
                    </div>
                  ) : isOwner ? (
                    <div className="mt-5 ml-3 border-l-2 border-dashed border-orange/40 pl-4 sm:ml-12">
                      {isAnswerEditorOpen ? (
                        <div>
                          <label
                            htmlFor={`answer-${item.id}`}
                            className="text-sm font-semibold text-petrol-dark"
                          >
                            Responder pregunta
                          </label>
                          <textarea
                            ref={answerInputRef}
                            id={`answer-${item.id}`}
                            value={answerText}
                            maxLength={2000}
                            onChange={(event) => {
                              setAnswerText(event.target.value)

                              setAnswerError(null)
                            }}
                            rows={3}
                            className="mt-2 w-full resize-y rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
                            aria-invalid={Boolean(answerError)}
                            aria-describedby={
                              answerError
                                ? `answer-error-${item.id}`
                                : undefined
                            }
                          />
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs text-muted">
                              {answerText.length}/2000
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAnsweringId(null)

                                  setAnswerText("")

                                  setAnswerError(null)
                                }}
                                className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-bg"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitAnswer()}
                                disabled={isSubmittingAnswer}
                                className="rounded-xl bg-petrol px-4 py-2.5 text-sm font-bold text-white hover:bg-petrol-dark disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isSubmittingAnswer
                                  ? "Enviando…"
                                  : "Enviar respuesta"}
                              </button>
                            </div>
                          </div>
                          {answerError && (
                            <p
                              id={`answer-error-${item.id}`}
                              role="alert"
                              className="mt-2 text-sm font-semibold text-red-700"
                            >
                              {answerError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-dark">
                            Pendiente de respuesta
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAnsweringId(item.id)

                              setAnswerText("")

                              setAnswerError(null)

                              window.setTimeout(
                                () => answerInputRef.current?.focus(),

                                0,
                              )
                            }}
                            className="rounded-xl border border-petrol px-4 py-2 text-sm font-bold text-petrol hover:bg-petrol/5"
                          >
                            Responder
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              )
            })}
            {questions.length < totalCount && (
              <button
                type="button"
                onClick={() => void loadQuestions(true)}
                disabled={isLoadingMore}
                className="mx-auto block rounded-xl border border-petrol px-5 py-2.5 text-sm font-bold text-petrol transition hover:bg-petrol/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? "Cargando…" : "Ver más preguntas"}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
