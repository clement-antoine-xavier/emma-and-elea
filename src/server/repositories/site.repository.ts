import {prisma} from "@/lib/prisma";
import {withTransaction} from "./transaction";
import type {SiteRecord} from "./types";
import type {SiteKind} from "@/server/validators/site.schema";

export type SiteInput = {
  name: string;
  code: string;
  kind: SiteKind;
  city: string | null;
  timezone: string;
};

const siteSelect = {
  id: true,
  code: true,
  name: true,
  kind: true,
  city: true,
  timezone: true,
  isActive: true,
  archivedAt: true,
} as const;

type SelectedSite = {
  id: string;
  code: string;
  name: string;
  kind: string;
  city: string | null;
  timezone: string;
  isActive: boolean;
  archivedAt: Date | null;
};

function toRecord(site: SelectedSite): SiteRecord {
  return {
    id: site.id,
    code: site.code,
    name: site.name,
    kind: site.kind as SiteRecord["kind"],
    city: site.city,
    timezone: site.timezone,
    isActive: site.isActive,
    archivedAt: site.archivedAt,
  };
}

export interface SiteRepository {
  list(organizationId: string): Promise<SiteRecord[]>;
  findById(organizationId: string, id: string): Promise<SiteRecord | null>;
  count(organizationId: string): Promise<number>;
  countActive(organizationId: string): Promise<number>;
  create(organizationId: string, input: SiteInput): Promise<SiteRecord>;
  update(
    organizationId: string,
    id: string,
    input: SiteInput,
  ): Promise<SiteRecord | null>;
  archive(organizationId: string, id: string): Promise<boolean>;
  /**
   * Creates a site only when the organization has none. Used by onboarding, so
   * a retry after a partial failure cannot create a second site.
   */
  ensureFirst(organizationId: string, input: SiteInput): Promise<SiteRecord>;
}

export const siteRepository: SiteRepository = {
  async list(organizationId) {
    const sites = await prisma.site.findMany({
      where: {organizationId},
      orderBy: [{isActive: "desc"}, {name: "asc"}],
      select: siteSelect,
    });

    return sites.map(toRecord);
  },

  async findById(organizationId, id) {
    const site = await prisma.site.findFirst({
      where: {id, organizationId},
      select: siteSelect,
    });

    return site ? toRecord(site) : null;
  },

  async count(organizationId) {
    return prisma.site.count({where: {organizationId}});
  },

  async countActive(organizationId) {
    return prisma.site.count({where: {organizationId, archivedAt: null}});
  },

  async create(organizationId, input) {
    const site = await prisma.site.create({
      data: {organizationId, ...input},
      select: siteSelect,
    });

    return toRecord(site);
  },

  async update(organizationId, id, input) {
    const result = await prisma.site.updateMany({
      where: {id, organizationId},
      data: input,
    });

    if (result.count === 0) return null;

    return this.findById(organizationId, id);
  },

  async archive(organizationId, id) {
    const result = await prisma.site.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date(), isActive: false},
    });

    return result.count > 0;
  },

  async ensureFirst(organizationId, input) {
    return withTransaction(async (tx) => {
      const existing = await tx.site.findFirst({
        where: {organizationId},
        select: siteSelect,
      });

      if (existing) return toRecord(existing);

      const created = await tx.site.create({
        data: {organizationId, ...input},
        select: siteSelect,
      });

      return toRecord(created);
    });
  },
};
