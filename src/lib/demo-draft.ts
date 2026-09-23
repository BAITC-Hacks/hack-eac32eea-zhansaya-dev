import { readDrafts, saveDraft } from "@/lib/draft-storage";
import type { Challenge } from "@/types/challenge";

// Exact description explicitly approved by the user. No inferred business facts.
export const CAFETERIA_DEMO_DESCRIPTION = "We want to reduce queues in our university cafeteria.";
const DEMO_ID = "demo-university-cafeteria-v1";

/** Explicit opt-in only. Reopening preserves all edits and other saved drafts. */
export function openCafeteriaDemo(): Challenge {
  const existing = readDrafts().find(draft => draft.id === DEMO_ID);
  if (existing) return existing;
  const now = new Date().toISOString();
  const draft: Challenge = {
    id: DEMO_ID, demoData: true, draftDescription: CAFETERIA_DEMO_DESCRIPTION,
    status: "draft", createdAt: now, updatedAt: now,
    clarificationQuestions: [], taskCard: {},
  };
  saveDraft(draft);
  return draft;
}
