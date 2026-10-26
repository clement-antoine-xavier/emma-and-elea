import {DomainError} from "@/server/domain/errors";
import type {Actor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {InvitationRepository} from "@/server/repositories/invitation.repository";
import type {InvitationDetailRecord} from "@/server/repositories/types";

export type InvitationViewState =
  | "pending"
  | "expired"
  | "accepted"
  | "unavailable"
  | "wrong-account"
  | "unauthenticated";

export type InvitationView = {
  invitation: InvitationDetailRecord;
  state: InvitationViewState;
};

export interface InvitationService {
  getInvitationView(
    viewer: Actor | null,
    invitationId: string,
  ): Promise<InvitationView | null>;
  acceptInvitation(
    actor: Actor | null,
    invitationId: string,
    headers: Headers,
  ): Promise<{organizationId: string}>;
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export function createInvitationService(deps: {
  invitationRepository: InvitationRepository;
  authGateway: BetterAuthGateway;
}): InvitationService {
  return {
    async getInvitationView(viewer, invitationId) {
      const invitation =
        await deps.invitationRepository.findById(invitationId);

      if (!invitation) return null;

      let state: InvitationViewState;

      if (invitation.status === "accepted") {
        state = "accepted";
      } else if (invitation.status !== "pending") {
        state = "unavailable";
      } else if (isExpired(invitation.expiresAt)) {
        state = "expired";
      } else if (!viewer) {
        state = "unauthenticated";
      } else if (
        viewer.email.toLowerCase() !== invitation.email.toLowerCase()
      ) {
        state = "wrong-account";
      } else {
        state = "pending";
      }

      return {invitation, state};
    },

    async acceptInvitation(actor, invitationId, headers) {
      if (!actor) throw new DomainError("FORBIDDEN");

      const invitation =
        await deps.invitationRepository.findById(invitationId);

      if (!invitation) throw new DomainError("NOT_FOUND");
      if (invitation.status !== "pending") {
        throw new DomainError("INVITATION_NOT_PENDING");
      }
      if (isExpired(invitation.expiresAt)) {
        throw new DomainError("INVITATION_EXPIRED");
      }
      if (actor.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new DomainError("WRONG_ACCOUNT");
      }

      return deps.authGateway.acceptInvitation(invitation.id, headers);
    },
  };
}
