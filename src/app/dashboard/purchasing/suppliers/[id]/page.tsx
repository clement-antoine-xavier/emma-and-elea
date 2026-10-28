import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {ArchiveSupplierButton} from "@/components/purchasing/archive-supplier-button";
import {SupplierEditForm} from "@/components/purchasing/supplier-edit-form";
import {SupplierItemManager} from "@/components/purchasing/supplier-item-manager";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {supplierService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type SupplierParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: SupplierParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("supplier:read");
  const supplier = await supplierService.getSupplier(actor, id);
  const t = await getTranslations("Suppliers");

  return {
    title: supplier
      ? `${supplier.name} · ${t("title")}`
      : t("metadataTitle"),
  };
}

export default async function SupplierDetailPage({params}: SupplierParams) {
  const {id} = await params;
  const actor = await requirePermission("supplier:read");
  const supplier = await supplierService.getSupplier(actor, id);

  if (!supplier) notFound();

  const [t, options] = await Promise.all([
    getTranslations("Suppliers"),
    supplierService.getFormOptions(actor),
  ]);
  const canWrite = can(actor.role, "supplier:write");

  return (
    <PageShell
      title={supplier.name}
      intro={t("detailIntro", {code: supplier.code})}
      actions={
        <Button
          label={t("backToList")}
          variant="secondary"
          href="/dashboard/purchasing/suppliers"
        />
      }
      contentWidth={1200}
    >
      <DetailShell
        asideLabel={t("archived")}
        aside={
          <Stack gap={4}>
            <Card padding={5}>
              <Stack gap={3}>
                <Heading level={2}>{t("statusTitle")}</Heading>
                <HStack gap={2} wrap="wrap">
                  <Badge
                    label={
                      supplier.isArchived ? t("archived") : t("active")
                    }
                    variant={supplier.isArchived ? "neutral" : "success"}
                  />
                </HStack>
                <Text type="supporting">{t("detailIntro", {code: supplier.code})}</Text>
              </Stack>
            </Card>
            {canWrite && !supplier.isArchived ? (
              <Card padding={5}>
                <ArchiveSupplierButton
                  supplierId={supplier.id}
                  supplierName={supplier.name}
                />
              </Card>
            ) : null}
          </Stack>
        }
      >
        <Stack gap={6}>
          <SupplierEditForm supplier={supplier} />
          <SupplierItemManager
            supplierId={supplier.id}
            items={supplier.items}
            itemOptions={options.items}
            units={options.units}
            canWrite={canWrite}
          />
        </Stack>
      </DetailShell>
    </PageShell>
  );
}
