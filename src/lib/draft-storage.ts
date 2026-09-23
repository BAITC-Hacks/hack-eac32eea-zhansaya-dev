import type { Challenge } from "@/types/challenge";
import { isClarificationQuestion } from "@/lib/clarification";
import { sourceChanged, sourceSnapshot } from "@/lib/task-card";

const STORAGE_KEY = "ai-sana.challenge-drafts.v1";

function isDraft(value: unknown): value is Challenge {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return typeof draft.id === "string" && draft.id.length > 0
    && typeof draft.draftDescription === "string"
    && (draft.status === "draft" || draft.status === "published")
    && (draft.status !== "published" || isPublishedSnapshot(draft.publishedSnapshot, draft.id, draft.publishedAt))
    && (draft.taskCardCreatedAt === undefined || (typeof draft.taskCardCreatedAt === "string" && Number.isFinite(Date.parse(draft.taskCardCreatedAt))))
    && (draft.taskCardNeedsReview === undefined || typeof draft.taskCardNeedsReview === "boolean")
    && (draft.confirmation === undefined || (!!draft.confirmation && typeof draft.confirmation === "object"
      && "confirmedBy" in draft.confirmation && typeof draft.confirmation.confirmedBy === "string"
      && "confirmedAt" in draft.confirmation && typeof draft.confirmation.confirmedAt === "string" && Number.isFinite(Date.parse(draft.confirmation.confirmedAt))))
    && (draft.sourceHistory === undefined || (Array.isArray(draft.sourceHistory) && draft.sourceHistory.every((entry) =>
      !!entry && typeof entry === "object" && typeof entry.savedAt === "string" && typeof entry.draftDescription === "string"
      && (entry.businessName === undefined || typeof entry.businessName === "string")
      && (entry.contactNameOrEmail === undefined || typeof entry.contactNameOrEmail === "string")
      && Array.isArray(entry.clarificationQuestions) && entry.clarificationQuestions.every(isClarificationQuestion))))
    && typeof draft.createdAt === "string" && Number.isFinite(Date.parse(draft.createdAt))
    && typeof draft.updatedAt === "string" && Number.isFinite(Date.parse(draft.updatedAt))
    && (draft.businessName === undefined || typeof draft.businessName === "string")
    && (draft.contactNameOrEmail === undefined || typeof draft.contactNameOrEmail === "string")
    && (draft.clarificationSourceDescription === undefined || typeof draft.clarificationSourceDescription === "string")
    && Array.isArray(draft.clarificationQuestions) && draft.clarificationQuestions.every(isClarificationQuestion)
    && new Set(draft.clarificationQuestions.map((question) => question.id)).size === draft.clarificationQuestions.length
    && !!draft.taskCard && typeof draft.taskCard === "object" && !Array.isArray(draft.taskCard)
    && Object.values(draft.taskCard).every((field) => typeof field === "string");
}

function isPublishedSnapshot(value: unknown, id: string, publishedAt: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  const confirmation = snapshot.confirmation as Record<string, unknown> | undefined;
  return snapshot.id === id && snapshot.status === "published"
    && typeof publishedAt === "string" && Number.isFinite(Date.parse(publishedAt)) && snapshot.publishedAt === publishedAt
    && !!snapshot.taskCard && typeof snapshot.taskCard === "object" && !Array.isArray(snapshot.taskCard)
    && Object.values(snapshot.taskCard).every((field) => typeof field === "string")
    && !!confirmation && typeof confirmation.confirmedBy === "string" && typeof confirmation.confirmedAt === "string"
    && Number.isFinite(Date.parse(confirmation.confirmedAt));
}

/** Read only on the client. Fail closed rather than replacing unreadable drafts. */
export function readDrafts(): Challenge[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isDraft)
    || new Set(parsed.map((draft) => draft.id)).size !== parsed.length) {
    throw new Error("Saved draft data is not readable.");
  }
  return parsed;
}

export function saveDraft(draft: Challenge): Challenge[] {
  // Read again before writing so saving one draft preserves other stored drafts.
  const drafts = readDrafts();
  const index = drafts.findIndex((item) => item.id === draft.id);
  const previous = drafts[index];
  // Ordinary edits can never create, replace, or remove a publication snapshot.
  draft = { ...draft, status: previous?.publishedSnapshot ? "published" : "draft",
    publishedSnapshot: previous?.publishedSnapshot, publishedAt: previous?.publishedAt };
  if (previous) {
    const changed = sourceChanged(previous, draft);
    const cardChanged = JSON.stringify(previous.taskCard) !== JSON.stringify(draft.taskCard);
    const history = previous.sourceHistory ?? [];
    draft = { ...draft, sourceHistory: changed ? [...history, sourceSnapshot(previous)] : history };
    if ((changed || cardChanged) && previous.taskCardCreatedAt) {
      draft = { ...draft, confirmation: undefined, taskCardNeedsReview: true };
    }
  }
  if (index === -1) drafts.unshift(draft);
  else drafts[index] = draft;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  return drafts;
}

/** One atomic write, keyed by the existing ID. Repeat clicks return the same snapshot. */
export function publishChallenge(expected: Challenge): Challenge[] {
  const drafts = readDrafts();
  const index = drafts.findIndex((draft) => draft.id === expected.id);
  const current = drafts[index];
  if (!current) throw new Error("Save this challenge before publishing.");
  if (current.publishedSnapshot) return drafts;
  if (!current.taskCardCreatedAt || !current.confirmation || current.taskCardNeedsReview
    || sourceChanged(current, expected) || JSON.stringify(current.taskCard) !== JSON.stringify(expected.taskCard)
    || JSON.stringify(current.confirmation) !== JSON.stringify(expected.confirmation)) {
    throw new Error("The saved card needs review and confirmation before publishing. Refresh to load the latest version.");
  }
  const publishedAt = new Date().toISOString();
  drafts[index] = { ...current, status: "published", publishedAt, updatedAt: publishedAt,
    publishedSnapshot: { id: current.id, status: "published", publishedAt,
      taskCard: { ...current.taskCard }, confirmation: { ...current.confirmation } } };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  return drafts;
}

export function readPublishedChallenges() {
  return readDrafts().flatMap((draft) => draft.publishedSnapshot ? [draft.publishedSnapshot] : []);
}
