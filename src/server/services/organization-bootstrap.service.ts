import {
  DEFAULT_LOSS_REASONS,
  type DefaultLossReason,
} from "@/server/domain/organization-defaults";
import type {OrganizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import type {
  SiteInput,
  SiteRepository,
} from "@/server/repositories/site.repository";

export interface OrganizationBootstrapService {
  /**
   * Idempotent tenant bootstrap. The Better Auth hook runs it without a site
   * when the organization row is created; onboarding then runs it again with
   * the first site, which is only created when the organization has none.
   */
  bootstrapOrganization(
    organizationId: string,
    options?: {site?: SiteInput},
  ): Promise<void>;
}

export function createOrganizationBootstrapService(deps: {
  settingsRepository: OrganizationSettingsRepository;
  siteRepository: SiteRepository;
  defaults?: readonly DefaultLossReason[];
}): OrganizationBootstrapService {
  const defaults = deps.defaults ?? DEFAULT_LOSS_REASONS;

  return {
    async bootstrapOrganization(organizationId, options) {
      await deps.settingsRepository.ensureDefaults(organizationId, defaults);

      if (options?.site) {
        await deps.siteRepository.ensureFirst(organizationId, options.site);
      }
    },
  };
}
