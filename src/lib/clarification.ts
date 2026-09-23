import type { ClarificationQuestion } from "@/types/challenge";

export function isClarificationQuestion(value: unknown): value is ClarificationQuestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && !!item.id
    && typeof item.question === "string" && !!item.question.trim() && item.question.length <= 1000
    && (item.answer === undefined || typeof item.answer === "string");
}

export function parseGeneratedQuestions(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid output");
  const object = value as Record<string, unknown>;
  const questions = object.questions;
  if (Object.keys(object).length !== 1 || !Array.isArray(questions)
    || questions.length < 3 || questions.length > 7
    || !questions.every((question): question is string => typeof question === "string"
      && !!question.trim() && question.length <= 1000)
    || new Set(questions.map((question) => question.trim().toLowerCase())).size !== questions.length) {
    throw new Error("Invalid questions");
  }
  return questions;
}
