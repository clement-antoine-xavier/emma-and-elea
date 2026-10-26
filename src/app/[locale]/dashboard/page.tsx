import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {getTranslations} from "next-intl/server";
import {routing} from "@/i18n/routing";
import {requireOrganization} from "@/lib/access";
import {can, type Permission} from "@/lib/permissions";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
export const instant = false;

type LocaleParams = {params: Promise<{locale: string}>};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: "Dashboard"});

  return {title: t("metadataTitle")};
}

const areas: ReadonlyArray<{
  key:
    | "catalog"
    | "recipes"
    | "costs"
    | "production"
    | "stock"
    | "sales"
    | "team"
    | "reports";
  read: Permission;
  write?: Permission;
}> = [
  {key: "catalog", read: "catalog:read", write: "catalog:write"},
  {key: "recipes", read: "recipe:read", write: "recipe:write"},
  {key: "costs", read: "cost:read"},
  {key: "production", read: "production:read", write: "production:write"},
  {key: "stock", read: "stock:read", write: "stock:write"},
  {key: "sales", read: "order:read", write: "order:write"},
  {key: "team", read: "team:read", write: "team:write"},
  {key: "reports", read: "report:read"},
];

export default async function DashboardPage() {
  const context = await requireOrganization();
  const t = await getTranslations("Dashboard.overview");
  const tRoles = await getTranslations("Roles");

  const visibleAreas = areas.filter((area) => can(context.role, area.read));

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={8} maxWidth={1120} width="100%">
        <Stack gap={2}>
          <Text type="label" color="accent">
            {t("eyebrow")}
          </Text>
          <Heading level={1} type="display-3">
            {t("title", {name: context.user.name})}
          </Heading>
          <Text type="large" color="secondary">
            {t("intro", {
              organization: context.organization.name,
              role: tRoles(`${context.role}.label`),
            })}
          </Text>
        </Stack>

        <Grid columns={{minWidth: 280, max: 2}} gap={4}>
          <Card padding={5}>
            <Stack gap={3}>
              <Text type="label" color="secondary">
                {t("roleTitle")}
              </Text>
              <HStack gap={3} align="center" wrap="wrap">
                <Heading level={2}>
                  {tRoles(`${context.role}.label`)}
                </Heading>
                <Badge
                  label={context.organization.slug}
                  variant="neutral"
                />
              </HStack>
              <Text color="secondary">
                {tRoles(`${context.role}.description`)}
              </Text>
            </Stack>
          </Card>

          <Card padding={5}>
            <Stack gap={3}>
              <Text type="label" color="secondary">
                {t("organizationTitle")}
              </Text>
              <Heading level={2}>
                {context.organization.name}
              </Heading>
              <Text color="secondary">{t("organizationBody")}</Text>
            </Stack>
          </Card>
        </Grid>

        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>
              {t("accessTitle")}
            </Heading>
            <Text color="secondary">{t("accessIntro")}</Text>
          </Stack>
          <Grid columns={{minWidth: 260, max: 3}} gap={4}>
            {visibleAreas.map((area) => {
              const canWrite =
                area.write !== undefined && can(context.role, area.write);

              return (
                <Card key={area.key} padding={5}>
                  <Stack gap={2}>
                    <Heading level={3}>
                      {t(`areas.${area.key}`)}
                    </Heading>
                    <Text type="supporting" color="secondary">
                      {canWrite ? t("manage") : t("view")}
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </Grid>
        </Stack>

        {context.isSupport ? (
          <Section variant="muted" padding={4}>
            <Text type="supporting">{t("supportNote")}</Text>
          </Section>
        ) : null}
        </Stack>
      </Center>
    </Section>
  );
}
