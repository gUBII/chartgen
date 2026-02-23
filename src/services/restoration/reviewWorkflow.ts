export type ReviewStatus = "PENDING_SUPERVISOR_REVIEW" | "APPROVED" | "REJECTED";
export type ReviewerRole = "SUPERVISOR" | "CLINICAL_LEAD" | "SUPPORT_WORKER";
export type ReviewDecision = "APPROVE" | "REJECT";

export interface CandidateReviewMetadata {
  reviewStatus: ReviewStatus;
  generatedByStaffId: string;
  reviewedByStaffId?: string | null;
  reviewedAt?: Date | null;
  reviewComment?: string | null;
}

export interface ReviewDecisionInput {
  reviewerStaffId: string;
  reviewerRole: ReviewerRole;
  decision: ReviewDecision;
  reviewComment?: string | null;
}

const ELEVATED_REVIEWER_ROLES = new Set<ReviewerRole>(["SUPERVISOR", "CLINICAL_LEAD"]);

const requireElevatedRole = (role: ReviewerRole): void => {
  if (!ELEVATED_REVIEWER_ROLES.has(role)) {
    throw new Error("Only supervisors or clinical leads can review restored entries.");
  }
};

const requireSegregationOfDuties = (generatedByStaffId: string, reviewerStaffId: string): void => {
  if (generatedByStaffId === reviewerStaffId) {
    throw new Error("Generator and reviewer must be different staff members.");
  }
};

const requirePendingStatus = (status: ReviewStatus): void => {
  if (status !== "PENDING_SUPERVISOR_REVIEW") {
    throw new Error("Only pending candidates can be reviewed.");
  }
};

export const applyReviewDecision = (
  candidate: CandidateReviewMetadata,
  input: ReviewDecisionInput
): CandidateReviewMetadata => {
  requirePendingStatus(candidate.reviewStatus);
  requireElevatedRole(input.reviewerRole);
  requireSegregationOfDuties(candidate.generatedByStaffId, input.reviewerStaffId);

  const trimmedComment = input.reviewComment?.trim() ?? "";
  if (input.decision === "REJECT" && trimmedComment.length < 10) {
    throw new Error("Rejected candidates require a review comment of at least 10 characters.");
  }

  return {
    ...candidate,
    reviewStatus: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
    reviewedByStaffId: input.reviewerStaffId,
    reviewedAt: new Date(),
    reviewComment: trimmedComment.length > 0 ? trimmedComment : null,
  };
};

export const canPromoteToProductionLedger = (candidate: CandidateReviewMetadata): boolean => {
  return candidate.reviewStatus === "APPROVED";
};
