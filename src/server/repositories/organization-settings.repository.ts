import {prisma} from "@/lib/prisma";
import type {DefaultLossReason} from "@/server/domain/organization-defaults";

export interface OrganizationSettingsRepository {
  ensureDefaults(
    organizationId: string,
    lossReasons: readonly DefaultLossReason[],
  ): Promise<void>;
}

export const organizationSettingsRepository: OrganizationSettingsRepository = {
  async ensureDefaults(organizationId, lossReasons) {
    await prisma.$transaction([
      prisma.organizationSetting.upsert({
        where: {organizationId},
        create: {organizationId},
        update: {},
      }),
      prisma.lossReason.createMany({
        data: lossReasons.map((reason) => ({
          organizationId,
          code: reason.code,
          labelFr: reason.labelFr,
          labelEn: reason.labelEn,
          category: reason.category,
          sortOrder: reason.sortOrder,
        })),
        skipDuplicates: true,
      }),
    ]);
  },
};
