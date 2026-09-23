export type ProposalStatus = "pending" | "accepted" | "rejected";

export interface TeamProposal {
  id: string;
  challengeId: string;
  teamName: string;
  solutionIdea: string;
  plan: string;
  timeline: string;
  prototypeLink?: string;
  status: ProposalStatus;
  submittedAt: string;
  /** Captured from the fixed published snapshot, never the working copy. */
  challengeTitle: string;
  challengePublishedAt: string;
  /** Human decision only. AI must never select or assign teams. */
  businessDecision?: {
    outcome: "accepted" | "rejected";
    decidedBy: string;
    decidedAt: string;
    feedback?: string;
  };
  createdAt: string;
  updatedAt: string;
}
