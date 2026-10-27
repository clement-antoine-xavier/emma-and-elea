import {can} from "@/lib/permissions";
import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DEFAULT_ORGANIZATION_SETTINGS} from "@/server/domain/organization-settings";
import type {
  OrganizationSettingsInput,
  OrganizationSettingsRepository,
} from "@/server/repositories/organization-settings.repository";
import type {OrganizationSettingsRecord} from "@/server/repositories/types";

export type SettingsView = {
  settings: OrganizationSettingsRecord;
  canUpdate: boolean;
};

export interface SettingsService {
  getSettings(actor: Actor | null): Promise<SettingsView>;
  updateSettings(
    actor: Actor | null,
    input: OrganizationSettingsInput,
  ): Promise<OrganizationSettingsRecord>;
}

export function createSettingsService(deps: {
  settingsRepository: OrganizationSettingsRepository;
}): SettingsService {
  return {
    async getSettings(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "organization:read");

      const stored = await deps.settingsRepository.get(actor.organizationId);

      return {
        settings: stored ?? DEFAULT_ORGANIZATION_SETTINGS,
        canUpdate: can(actor.role, "organization:update"),
      };
    },

    async updateSettings(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "organization:update");

      return deps.settingsRepository.update(actor.organizationId, input);
    },
  };
}
