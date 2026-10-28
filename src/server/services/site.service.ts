
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {isUniqueConstraintError} from "@/server/repositories/errors";
import type {SiteRepository, SiteInput} from "@/server/repositories/site.repository";
import type {SiteRecord} from "@/server/repositories/types";

export type SiteView = {
  sites: SiteRecord[];
  canWrite: boolean;
};

export interface SiteService {
  getSites(actor: Actor | null): Promise<SiteView>;
  getSite(actor: Actor | null, id: string): Promise<SiteRecord | null>;
  createSite(actor: Actor | null, input: SiteInput): Promise<SiteRecord>;
  updateSite(
    actor: Actor | null,
    input: SiteInput & {id: string},
  ): Promise<SiteRecord>;
  archiveSite(actor: Actor | null, id: string): Promise<void>;
}

export function createSiteService(deps: {
  siteRepository: SiteRepository;
}): SiteService {
  async function requireSite(
    organizationId: string,
    id: string,
  ): Promise<SiteRecord> {
    const site = await deps.siteRepository.findById(organizationId, id);
    if (!site) throw new DomainError("NOT_FOUND");
    return site;
  }

  function mapUniqueCode(error: unknown): never {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("DUPLICATE_CODE", undefined, {cause: error});
    }
    throw error;
  }

  return {
    async getSites(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "site:read");

      return {
        sites: await deps.siteRepository.list(actor.organizationId),
        canWrite: isGranted(actor, "site:write"),
      };
    },

    async getSite(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "site:read");

      return deps.siteRepository.findById(actor.organizationId, id);
    },

    async createSite(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "site:write");

      try {
        return await deps.siteRepository.create(actor.organizationId, input);
      } catch (error) {
        mapUniqueCode(error);
      }
    },

    async updateSite(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "site:write");

      await requireSite(actor.organizationId, input.id);

      try {
        const site = await deps.siteRepository.update(
          actor.organizationId,
          input.id,
          input,
        );
        if (!site) throw new DomainError("NOT_FOUND");
        return site;
      } catch (error) {
        mapUniqueCode(error);
      }
    },

    async archiveSite(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "site:write");

      const site = await requireSite(actor.organizationId, id);
      if (site.archivedAt) return;

      const activeSites = await deps.siteRepository.countActive(
        actor.organizationId,
      );
      if (activeSites <= 1) throw new DomainError("LAST_SITE");

      await deps.siteRepository.archive(actor.organizationId, id);
    },
  };
}
