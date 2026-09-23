import type { ReadinessLevel, ReadinessRating, TaskCard } from "@/types/challenge";

// Exact normalized placeholder values, not substring matching. For example,
// "No data is available yet; a survey is planned" remains useful supplied text.
const placeholders = new Set([
  "needs information", "need information", "not provided", "not specified",
  "unknown", "tbd", "to be determined", "to be confirmed", "todo", "tbc",
  "n a", "na", "none", "null", "undefined", "placeholder", "enter text here",
]);

export function hasReadinessInformation(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return !!normalized && !placeholders.has(normalized);
}

export function readinessLevel(score: number): ReadinessLevel {
  if (score < 40) return "Draft";
  if (score < 70) return "Working";
  if (score < 90) return "Ready";
  return "Priority";
}

type CriterionKey = keyof ReadinessRating["breakdown"];
interface FieldRule {
  field: keyof TaskCard;
  label: string;
  points: number;
  suggestion: string;
}
export const readinessCriteria: Array<{ key: CriterionKey; label: string; fields: FieldRule[] }> = [
  { key: "contextAndNeed", label: "Context and need/problem", fields: [
    { field: "context", label: "Context", points: 10, suggestion: "Describe the current situation and where the problem occurs." },
    { field: "needOrProblem", label: "Need/problem", points: 10, suggestion: "State the business problem or need the team should address." },
  ] },
  { key: "dataAndMaterials", label: "Available data/materials", fields: [
    { field: "availableDataOrMaterials", label: "Available data/materials", points: 20, suggestion: "List available data/materials and access details, or explicitly explain what is unavailable." },
  ] },
  { key: "expectedResult", label: "Expected result", fields: [
    { field: "expectedResult", label: "Expected result", points: 15, suggestion: "Describe what the student team should deliver." },
  ] },
  { key: "successCriteria", label: "Success criteria", fields: [
    { field: "successCriteria", label: "Success criteria", points: 15, suggestion: "State how the business will judge success, ideally with a measurable target." },
  ] },
  { key: "constraints", label: "Constraints", fields: [
    { field: "constraints", label: "Constraints", points: 10, suggestion: "Describe time, budget, access, or technical limits, or explicitly state that no constraints are known." },
  ] },
  { key: "users", label: "Users", fields: [
    { field: "users", label: "Users", points: 10, suggestion: "Identify who experiences the problem or will use the result." },
  ] },
  { key: "businessCommunication", label: "Business communication", fields: [
    { field: "businessContact", label: "Business contact", points: 5, suggestion: "Provide the business contact’s name or email." },
    { field: "communicationFormat", label: "Communication format", points: 5, suggestion: "Specify how the team and business will communicate, such as email or weekly meetings." },
  ] },
];

/** Presence-only rubric: each documented field earns all its points or zero.
 * Title has no weight. No length bonuses, AI judgments, or confirmation points.
 * Reads only the supplied card; never mutates it or inspects source suggestions.
 */
export function calculateReadiness(card: Partial<TaskCard>): ReadinessRating {
  const breakdown: ReadinessRating["breakdown"] = {
    contextAndNeed: 0, dataAndMaterials: 0, expectedResult: 0, successCriteria: 0,
    constraints: 0, users: 0, businessCommunication: 0,
  };
  const missingInformation: string[] = [];
  for (const criterion of readinessCriteria) {
    for (const rule of criterion.fields) {
      if (hasReadinessInformation(card[rule.field])) breakdown[criterion.key] += rule.points;
      else missingInformation.push(rule.label);
    }
  }
  const score = Math.max(0, Math.min(100, Object.values(breakdown).reduce((total, points) => total + points, 0)));
  return {
    score, level: readinessLevel(score), breakdown, missingInformation,
    explanation: "Completeness only: each nonempty, non-placeholder field earns its stated points. This does not verify facts, feasibility, or quality. Title and manual confirmation add no points.",
  };
}
