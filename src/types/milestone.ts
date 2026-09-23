/** A manual business confirmation, not AI verification or a payment. */
export interface ProjectMilestone {
  id: string;
  challengeId: string;
  acceptedProposalId: string;
  description: string;
  points: number;
  confirmedAt: string;
  confirmedBy: "Business user";
}
