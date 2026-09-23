/** Shared contracts for local drafting, clarification, task cards, and readiness. */
export type ReadinessLevel = "Draft" | "Working" | "Ready" | "Priority";
export type ChallengeStatus = "draft" | "clarifying" | "awaiting_confirmation" | "confirmed" | "published";

export interface TaskCard {
  title: string;
  context: string;
  needOrProblem: string;
  users: string;
  availableDataOrMaterials: string;
  constraints: string;
  expectedResult: string;
  successCriteria: string;
  businessContact: string;
  communicationFormat: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  answer?: string;
}

export interface ReadinessRating {
  /** Deterministic completeness score: 0–100. */
  score: number;
  /** Draft: 0–39; Working: 40–69; Ready: 70–89; Priority: 90–100. */
  level: ReadinessLevel;
  explanation: string;
  missingInformation: string[];
  breakdown: {
    contextAndNeed: number; // Max 20
    dataAndMaterials: number; // Max 20
    expectedResult: number; // Max 15
    successCriteria: number; // Max 15
    constraints: number; // Max 10
    users: number; // Max 10
    businessCommunication: number; // Max 10
  };
}

export interface Challenge {
  id: string;
  draftDescription: string;
  businessName?: string;
  contactNameOrEmail?: string;
  status: ChallengeStatus;
  clarificationQuestions: ClarificationQuestion[];
  /** Exact saved description used to generate the current questions. */
  clarificationSourceDescription?: string;
  /** Partial while being drafted; all generated content must remain editable. */
  taskCard: Partial<TaskCard>;
  taskCardCreatedAt?: string;
  taskCardNeedsReview?: boolean;
  /** Immutable source snapshots, kept separate from editable card fields. */
  sourceHistory?: Array<{
    savedAt: string;
    draftDescription: string;
    businessName?: string;
    contactNameOrEmail?: string;
    clarificationQuestions: ClarificationQuestion[];
  }>;
  readiness?: ReadinessRating;
  /** Only a manual business action may populate confirmation. */
  confirmation?: { confirmedBy: string; confirmedAt: string };
  publishedAt?: string;
  publishedSnapshot?: PublishedChallenge;
  createdAt: string;
  updatedAt: string;
}

/** Fixed public card; private draft and clarification history are excluded. */
export interface PublishedChallenge {
  id: string;
  status: "published";
  taskCard: Partial<TaskCard>;
  publishedAt: string;
  confirmation: { confirmedBy: string; confirmedAt: string };
}
