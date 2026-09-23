import type { TeamProposal } from "@/types/team-proposal";
import { readPublishedChallenges } from "@/lib/draft-storage";

export interface ProposalInput {
  teamName: string;
  solutionIdea: string;
  plan: string;
  timeline: string;
  prototypeLink: string;
}
export type ProposalErrors = Partial<Record<keyof ProposalInput, string>>;
export const proposalFields = [
  ["teamName", "Team name"], ["solutionIdea", "Solution idea"],
  ["plan", "Implementation plan"], ["timeline", "Estimated timeline"],
] as const;

export function validPrototypeLink(value: string): boolean {
  const link = value.trim();
  if (!link) return true;
  if (!/^https?:\/\//i.test(link) || /\s/.test(link)) return false;
  try {
    const url = new URL(link);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function validateProposal(input: ProposalInput): ProposalErrors {
  const errors: ProposalErrors = {};
  for (const [field, label] of proposalFields) {
    if (typeof input[field] !== "string" || !input[field].trim()) errors[field] = `${label} is required.`;
  }
  if (typeof input.prototypeLink !== "string" || !validPrototypeLink(input.prototypeLink)) {
    errors.prototypeLink = "Enter a complete http:// or https:// URL without spaces or login credentials, or leave this blank.";
  }
  return errors;
}

const STORAGE_KEY = "ai-sana.team-proposals.v1";
function isProposal(value: unknown): value is TeamProposal {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const decision = item.businessDecision as Record<string, unknown> | undefined;
  return typeof item.id === "string" && !!item.id && typeof item.challengeId === "string" && !!item.challengeId
    && typeof item.challengeTitle === "string" && ["pending", "accepted", "rejected"].includes(item.status as string)
    && ["submittedAt", "createdAt", "updatedAt", "challengePublishedAt"].every((field) => typeof item[field] === "string" && Number.isFinite(Date.parse(item[field] as string)))
    && proposalFields.every(([field]) => typeof item[field] === "string" && !!(item[field] as string).trim())
    && (item.status === "pending" ? decision === undefined : !!decision && typeof decision === "object"
      && decision.outcome === item.status && typeof decision.decidedBy === "string" && !!decision.decidedBy.trim()
      && typeof decision.decidedAt === "string" && Number.isFinite(Date.parse(decision.decidedAt)))
    && (item.prototypeLink === undefined || (typeof item.prototypeLink === "string" && validPrototypeLink(item.prototypeLink)));
}

export function readProposals(): TeamProposal[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isProposal) || new Set(parsed.map((item) => item.id)).size !== parsed.length) {
    throw new Error("Saved proposals are unreadable. Existing data has not been replaced.");
  }
  const accepted = parsed.filter((item) => item.status === "accepted");
  if (new Set(accepted.map((item) => item.challengeId)).size !== accepted.length) {
    throw new Error("Stored proposals contain conflicting accepted teams. No data has been changed.");
  }
  return parsed;
}

/** Only the business confirmation handler calls this. No AI or automatic decisions. */
export async function decideProposal(id: string, outcome: "accepted" | "rejected"): Promise<TeamProposal[]> {
  if (outcome !== "accepted" && outcome !== "rejected") throw new Error("Choose Accept or Reject.");
  // Serialize decisions across same-origin tabs and re-read inside the lock.
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new Error("This browser cannot safely coordinate decisions. Use a browser with Web Locks on localhost or HTTPS.");
  }
  return navigator.locks.request("ai-sana-proposal-decisions", () => {
    const proposals = readProposals();
    const index = proposals.findIndex((proposal) => proposal.id === id);
    const proposal = proposals[index];
    if (!proposal) throw new Error("Proposal not found. Refresh before reviewing again.");
    const published = readPublishedChallenges().find((challenge) => challenge.id === proposal.challengeId
      && challenge.publishedAt === proposal.challengePublishedAt);
    if (!published) throw new Error("The published challenge for this proposal is unavailable. No decision was saved.");
    if (proposal.status !== "pending") {
      if (proposal.status === outcome) return proposals; // repeated click preserves original timestamp
      throw new Error("This proposal already has a final decision and cannot be changed in this MVP.");
    }
    if (outcome === "accepted" && proposals.some((item) => item.challengeId === proposal.challengeId && item.status === "accepted")) {
      throw new Error("Another proposal has already been accepted for this challenge. This proposal remains pending.");
    }
    const now = new Date().toISOString();
    proposals[index] = { ...proposal, status: outcome, updatedAt: now,
      businessDecision: { outcome, decidedAt: now, decidedBy: "Business user (manual local decision)" } };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
    return proposals;
  });
}

/** Stable submission ID makes retries idempotent. Recheck publication at write time. */
export function submitProposal(id: string, challengeId: string, input: ProposalInput): TeamProposal {
  if (!id.trim() || Object.keys(validateProposal(input)).length) throw new Error("Check the required fields and prototype link before submitting.");
  const published = readPublishedChallenges().find((item) => item.id === challengeId);
  if (!published) throw new Error("This challenge is not published in this browser. Return to the catalog and choose a published challenge. Your text is still here.");
  const proposals = readProposals();
  const existing = proposals.find((item) => item.id === id);
  if (existing) {
    if (existing.challengeId !== challengeId) throw new Error("Submission ID conflicts with another challenge. Refresh before starting a new submission.");
    return existing;
  }
  const now = new Date().toISOString();
  const proposal: TeamProposal = { ...input, prototypeLink: input.prototypeLink.trim() || undefined,
    id, challengeId: published.id, challengeTitle: published.taskCard.title ?? "",
    challengePublishedAt: published.publishedAt, status: "pending", submittedAt: now, createdAt: now, updatedAt: now };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([proposal, ...proposals]));
  return proposal;
}
