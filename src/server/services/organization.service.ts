import {DomainError} from "@/server/domain/errors";
import type {Actor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {OrganizationSummary} from "@/server/repositories/types";

export interface OrganizationService {
  createOrganization(
    actor: Actor | null,
    input: {name: string; slug: string},
    headers: Headers,
  ): Promise<OrganizationSummary>;

  getOnboardingState(actor: Actor | null): {hasOrganization: boolean};
}

export function createOrganizationService(deps: {
  authGateway: BetterAuthGateway;
}): OrganizationService {
  return {
    async createOrganization(actor, input, headers) {
      if (!actor) throw new DomainError("FORBIDDEN");

      return deps.authGateway.createOrganization(input, headers);
    },

    getOnboardingState(actor) {
      return {hasOrganization: Boolean(actor?.organizationId)};
    },
  };
}
