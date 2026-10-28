import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {SiteEditForm} from "@/components/settings/site-edit-form";
import {requirePermission} from "@/server/auth/actor";
import {siteService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type SiteParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: SiteParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("site:read");
  const site = await siteService.getSite(actor, id);
  const t = await getTranslations("Sites");

  return {title: site ? `${site.name} · ${t("title")}` : t("metadataTitle")};
}

export default async function SiteDetailPage({params}: SiteParams) {
  const {id} = await params;
  const actor = await requirePermission("site:write");
  const t = await getTranslations("Sites");
  const site = await siteService.getSite(actor, id);

  if (!site) notFound();

  return (
    <PageShell
      title={site.name}
      intro={t("detailIntro", {code: site.code})}
      contentWidth={720}
      actions={
        <Button
          label={t("backToList")}
          variant="secondary"
          href="/dashboard/settings?section=sites"
        />
      }
    >
      <SiteEditForm site={site} />
    </PageShell>
  );
}
