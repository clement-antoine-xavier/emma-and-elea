import {DomainError} from "@/server/domain/errors";
import type {Actor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {OrganizationSummary} from "@/server/repositories/types";
import type {OrganizationBootstrapService} from "./organization-bootstrap.service";

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  siteName: string;
  siteCode: string;
};

export interface OrganizationService {
  createOrganization(
    actor: Actor | null,
    input: CreateOrganizationInput,
    headers: Headers,
  ): Promise<OrganizationSummary>;

  getOnboardingState(actor: Actor | null): {hasOrganization: boolean};
}

export function createOrganizationService(deps: {
  authGateway: BetterAuthGateway;
  bootstrapService: OrganizationBootstrapService;
}): OrganizationService {
  return {
    async createOrganization(actor, input, headers) {
      if (!actor) throw new DomainError("FORBIDDEN");

      const organization = await deps.authGateway.createOrganization(
        {name: input.name, slug: input.slug},
        headers,
      );

      try {
        await deps.bootstrapService.bootstrapOrganization(organization.id, {
          site: {
            name: input.siteName,
            code: input.siteCode,
            kind: "WORKSHOP",
            city: null,
            timezone: "Europe/Paris",
          },
        });
      } catch (error) {
        // The organization row is already committed. Losing the first site must
        // not turn a successful sign-up into an error; settings offers a retry.
        console.error(
          `Failed to create the first site for organization ${organization.id}`,
          error,
        );
      }

      return organization;
    },

    getOnboardingState(actor) {
      return {hasOrganization: Boolean(actor?.organizationId)};
    },
  };
}
