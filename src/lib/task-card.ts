import type { Challenge, TaskCard } from "@/types/challenge";

export const cardFields: Array<[keyof TaskCard, string]> = [
  ["title", "Title"], ["context", "Context"], ["needOrProblem", "Need/problem"],
  ["users", "Users"], ["availableDataOrMaterials", "Available data/materials"],
  ["constraints", "Constraints"], ["expectedResult", "Expected result"],
  ["successCriteria", "Success criteria"], ["businessContact", "Business contact"],
  ["communicationFormat", "Communication format"],
];

/** No semantic guessing: only copy exact input to business-selected destinations. */
export function createTaskCard(draft: Challenge, destinations: Record<string, keyof TaskCard | "">): Challenge {
  const card = Object.fromEntries(cardFields.map(([key]) => [key, ""])) as unknown as TaskCard;
  card.needOrProblem = draft.draftDescription;
  card.businessContact = draft.contactNameOrEmail ?? "";
  for (const item of draft.clarificationQuestions) {
    const field = destinations[item.id];
    if (field && cardFields.some(([key]) => key === field) && item.answer?.trim()) {
      card[field] = card[field] ? `${card[field]}\n\n${item.answer}` : item.answer;
    }
  }
  return { ...draft, taskCard: card, taskCardCreatedAt: new Date().toISOString(), taskCardNeedsReview: false, confirmation: undefined };
}

export function sourceSnapshot(draft: Challenge) {
  return {
    savedAt: draft.updatedAt,
    draftDescription: draft.draftDescription,
    businessName: draft.businessName,
    contactNameOrEmail: draft.contactNameOrEmail,
    clarificationQuestions: draft.clarificationQuestions.map((item) => ({ ...item })),
  };
}

export function sourceChanged(before: Challenge, after: Challenge) {
  const { savedAt: _beforeDate, ...a } = sourceSnapshot(before);
  const { savedAt: _afterDate, ...b } = sourceSnapshot(after);
  void _beforeDate; void _afterDate;
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** Confirmation is granted only by the explicit Confirm Card UI handler. */
export function confirmTaskCard(draft: Challenge): Challenge {
  if (!draft.taskCardCreatedAt) throw new Error("Create a task card first.");
  return { ...draft, taskCardNeedsReview: false, confirmation: {
    confirmedBy: "Business user (local manual confirmation)", confirmedAt: new Date().toISOString(),
  }, updatedAt: new Date().toISOString() };
}
