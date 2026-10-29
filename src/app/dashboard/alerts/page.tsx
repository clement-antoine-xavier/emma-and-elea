import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {List, ListItem} from "@astryxdesign/core/List";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {requirePermission} from "@/server/auth/actor";
import {alertService} from "@/server/services/container";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Alerts");

  return {title: t("metadataTitle")};
}

const BADGE: Record<string, "warning" | "error" | "info"> = {
  LOW_STOCK: "error",
  EXPIRING_LOT: "warning",
  PENDING_ABSENCE: "info",
  UNASSIGNED_TASK: "info",
};

export default async function AlertsPage() {
  const actor = await requirePermission("organization:read");
  const t = await getTranslations("Alerts");
  const alerts = await alertService.getAlerts(actor);

  return (
    <PageShell title={t("title")} intro={t("intro")}>
      {alerts.length === 0 ? (
        <Card padding={4}>
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyBody")}
            isCompact
          />
        </Card>
      ) : (
        <Card padding={0}>
          <List hasDividers>
            {alerts.map((alert) => (
              <ListItem
                key={alert.id}
                label={alert.title}
                description={alert.description}
                href={alert.href}
                endContent={
                  <Badge
                    variant={BADGE[alert.kind] ?? "info"}
                    label={t(`kinds.${alert.kind}`)}
                  />
                }
              />
            ))}
          </List>
        </Card>
      )}
    </PageShell>
  );
}
