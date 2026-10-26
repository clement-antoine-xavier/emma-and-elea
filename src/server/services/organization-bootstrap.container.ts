import {organizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import {createOrganizationBootstrapService} from "./organization-bootstrap.service";

/**
 * Kept separate from the main container so the Better Auth config can import
 * it without pulling in the auth gateway (which imports the auth instance).
 */
export const organizationBootstrapService = createOrganizationBootstrapService({
  settingsRepository: organizationSettingsRepository,
});
