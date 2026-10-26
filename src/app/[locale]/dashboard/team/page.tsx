import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {getTranslations} from "next-intl/server";
import {routing} from "@/i18n/routing";
import {requirePermission} from "@/lib/access";
import {assignableRolesFor} from "@/lib/permissions";
import {prisma} from "@/lib/prisma";
import {TeamManager} from "@/components/team-manager";

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

  const t = await getTranslations({locale, namespace: "Team"});

  return {title: t("metadataTitle")};
}

export default async function TeamPage() {
  const context = await requirePermission("member:read");
  const t = await getTranslations("Team");

  const [members, invitations] = await Promise.all([
    prisma.member.findMany({
      where: {organizationId: context.organization.id},
      orderBy: {createdAt: "asc"},
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {select: {name: true, email: true}},
      },
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: context.organization.id,
        status: "pending",
        expiresAt: {gt: new Date()},
      },
      orderBy: {createdAt: "asc"},
      select: {id: true, email: true, role: true, expiresAt: true},
    }),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <Stack gap={2}>
            <Heading level={1} type="display-3">
              {t("title")}
            </Heading>
            <Text type="large" color="secondary">
              {t("intro", {organization: context.organization.name})}
            </Text>
          </Stack>

          <TeamManager
            currentUserId={context.user.id}
            actorRole={context.role}
            assignableRoles={assignableRolesFor(context.role)}
            members={members.map((member) => ({
              id: member.id,
              userId: member.userId,
              name: member.user.name,
              email: member.user.email,
              role: member.role,
              joinedAt: member.createdAt.toISOString(),
            }))}
            invitations={invitations.map((invitation) => ({
              id: invitation.id,
              email: invitation.email,
              role: invitation.role ?? "staff",
              expiresAt: invitation.expiresAt.toISOString(),
            }))}
          />
        </Stack>
      </Center>
    </Section>
  );
}
