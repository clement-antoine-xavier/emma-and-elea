
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {computeVariance} from "@/server/domain/stock-count";
import type {
  StockCountDetailRecord,
  StockCountSummaryRecord,
} from "@/lib/dto";
import type {StockCountRepository} from "@/server/repositories/stock-count.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";

export type StockCountLineInput = {
  id: string;
  countedQuantity: string;
};

export interface StockCountService {
  getCounts(actor: Actor | null): Promise<{
    counts: StockCountSummaryRecord[];
    sites: {id: string; name: string; code: string}[];
    canCount: boolean;
    canPost: boolean;
  }>;
  getCount(
    actor: Actor | null,
    id: string,
  ): Promise<{
    count: StockCountDetailRecord;
    canCount: boolean;
    canPost: boolean;
  } | null>;
  createCount(
    actor: Actor | null,
    input: {siteId: string; countedAt: Date; note: string | null},
  ): Promise<{id: string}>;
  updateLines(
    actor: Actor | null,
    countId: string,
    lines: readonly StockCountLineInput[],
  ): Promise<void>;
  postCount(actor: Actor | null, id: string): Promise<void>;
  cancelCount(actor: Actor | null, id: string): Promise<void>;
}

export function createStockCountService(deps: {
  stockCountRepository: StockCountRepository;
  siteRepository: SiteRepository;
}): StockCountService {
  return {
    async getCounts(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      const [counts, sites] = await Promise.all([
        deps.stockCountRepository.listCounts(actor.organizationId),
        deps.siteRepository.list(actor.organizationId),
      ]);

      return {
        counts,
        sites: sites
          .filter((site) => !site.archivedAt)
          .map((site) => ({id: site.id, name: site.name, code: site.code})),
        canCount: isGranted(actor, "stock:count"),
        canPost: isGranted(actor, "stock:write"),
      };
    },

    async getCount(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      const count = await deps.stockCountRepository.findCount(
        actor.organizationId,
        id,
      );
      if (!count) return null;

      return {
        count,
        canCount: isGranted(actor, "stock:count"),
        canPost: isGranted(actor, "stock:write"),
      };
    },

    async createCount(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:count");

      const site = await deps.siteRepository.findById(
        actor.organizationId,
        input.siteId,
      );
      if (!site) throw new DomainError("NOT_FOUND");

      const draft = await deps.stockCountRepository.findDraft(
        actor.organizationId,
        input.siteId,
        input.countedAt,
      );
      if (draft) throw new DomainError("CONFLICT");

      return {
        id: await deps.stockCountRepository.createCount(
          actor.organizationId,
          {
            siteId: input.siteId,
            countedAt: input.countedAt,
            note: input.note,
            userId: actor.userId,
          },
        ),
      };
    },

    async updateLines(actorInput, countId, lines) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:count");

      const count = await deps.stockCountRepository.findCount(
        actor.organizationId,
        countId,
      );
      if (!count) throw new DomainError("NOT_FOUND");
      if (count.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const byId = new Map(count.lines.map((line) => [line.id, line]));
      const updates = lines.map((line) => {
        const existing = byId.get(line.id);
        if (!existing) throw new DomainError("NOT_FOUND");
        if (Number(line.countedQuantity) < 0) {
          throw new DomainError("INVALID_INPUT");
        }

        return {
          id: line.id,
          countedQuantity: line.countedQuantity,
          variance: computeVariance(
            existing.expectedQuantity,
            line.countedQuantity,
          ).toString(),
        };
      });

      await deps.stockCountRepository.updateLines(
        actor.organizationId,
        countId,
        updates,
      );
    },

    async postCount(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:write");

      await deps.stockCountRepository.post(
        actor.organizationId,
        id,
        actor.userId,
      );
    },

    async cancelCount(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:write");

      await deps.stockCountRepository.cancel(actor.organizationId, id);
    },
  };
}
