import { readPublishedChallenges } from "@/lib/draft-storage";
import { readProposals } from "@/lib/proposals";
import type { ProjectMilestone } from "@/types/milestone";

export const MILESTONE_POINTS = 10;
export const MILESTONE_DESCRIPTION_LIMIT = 1000;
const STORAGE_KEY = "ai-sana.project-milestones.v1";

function isMilestone(value: unknown): value is ProjectMilestone {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["id", "challengeId", "acceptedProposalId", "description"].every(key => typeof item[key] === "string" && !!item[key].trim())
    && (item.description as string).length <= MILESTONE_DESCRIPTION_LIMIT
    && item.points === MILESTONE_POINTS && item.confirmedBy === "Business user"
    && typeof item.confirmedAt === "string" && Number.isFinite(Date.parse(item.confirmedAt));
}

/** Invalid or orphaned records block totals and writes; never silently replace data. */
export function readMilestones(): ProjectMilestone[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Saved milestone data is unreadable. No data was changed."); }
  if (!Array.isArray(parsed) || !parsed.every(isMilestone) || new Set(parsed.map(item => item.id)).size !== parsed.length) {
    throw new Error("Saved milestone data is invalid. No data was changed.");
  }
  const proposals = readProposals();
  const published = readPublishedChallenges();
  if (parsed.some(item => !proposals.some(proposal => proposal.id === item.acceptedProposalId
    && proposal.status === "accepted" && proposal.challengeId === item.challengeId
    && published.some(challenge => challenge.id === item.challengeId && challenge.publishedAt === proposal.challengePublishedAt)))) {
    throw new Error("A milestone references a missing accepted proposal or published challenge. Points are unavailable; no data was changed.");
  }
  return parsed;
}

/** Called only after the business explicitly confirms completion. */
export async function confirmMilestone(id: string, proposalId: string, description: string): Promise<ProjectMilestone[]> {
  if (!id.trim() || !description.trim() || description.length > MILESTONE_DESCRIPTION_LIMIT) {
    throw new Error(`Describe the completed milestone in 1–${MILESTONE_DESCRIPTION_LIMIT} characters.`);
  }
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new Error("Use a browser with Web Locks on localhost or HTTPS to safely confirm milestones.");
  }
  return navigator.locks.request("ai-sana-milestones", () => {
    const proposal = readProposals().find(item => item.id === proposalId);
    if (!proposal || proposal.status !== "accepted") throw new Error("Only an accepted proposal can receive a confirmed milestone.");
    if (!readPublishedChallenges().some(item => item.id === proposal.challengeId && item.publishedAt === proposal.challengePublishedAt)) {
      throw new Error("The published challenge is unavailable. No points were awarded.");
    }
    const items = readMilestones();
    const existing = items.find(item => item.id === id);
    if (existing) {
      if (existing.acceptedProposalId !== proposalId || existing.description !== description) throw new Error("Milestone ID conflict. No points were awarded.");
      return items;
    }
    const milestone: ProjectMilestone = { id, challengeId: proposal.challengeId, acceptedProposalId: proposal.id,
      description, points: MILESTONE_POINTS, confirmedAt: new Date().toISOString(), confirmedBy: "Business user" };
    const updated = [...items, milestone];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  });
}
