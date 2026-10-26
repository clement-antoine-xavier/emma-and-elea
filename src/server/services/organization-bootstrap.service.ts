import {
  DEFAULT_LOSS_REASONS,
  type DefaultLossReason,
} from "@/server/domain/organization-defaults";
import type {OrganizationSettingsRepository} from "@/server/repositories/organization-settings.repository";

export interface OrganizationBootstrapService {
  bootstrapOrganization(organizationId: string): Promise<void>;
}

export function createOrganizationBootstrapService(deps: {
  settingsRepository: OrganizationSettingsRepository;
  defaults?: readonly DefaultLossReason[];
}): OrganizationBootstrapService {
  const defaults = deps.defaults ?? DEFAULT_LOSS_REASONS;

  return {
    async bootstrapOrganization(organizationId) {
      await deps.settingsRepository.ensureDefaults(organizationId, defaults);
    },
  };
}
