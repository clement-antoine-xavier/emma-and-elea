import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {TeamManager} from "@/components/team-manager";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {teamService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team");

  return {title: t("metadataTitle")};
}

export default async function TeamPage() {
  const actor = await requirePermission("team:read");
  const t = await getTranslations("Team");
  const canManageMembers = can(actor.role, "member:read");
  const view = canManageMembers
    ? await teamService.getTeamView(actor)
    : null;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <Stack gap={3}>
            <HStack gap={4} justify="between" align="end" wrap="wrap">
              <Stack gap={2}>
                <Heading level={1} type="display-3">
                  {t("title")}
                </Heading>
                <Text type="large" color="secondary">
                  {t("intro", {organization: actor.organization.name})}
                </Text>
              </Stack>
              <HStack gap={2} wrap="wrap">
                <Button
                  label={t("scheduleLink")}
                  variant="primary"
                  href="/dashboard/team/schedule"
                />
                <Button
                  label={t("employeesLink")}
                  variant="secondary"
                  href="/dashboard/team/employees"
                />
                <Button
                  label={t("absencesLink")}
                  variant="secondary"
                  href="/dashboard/team/absences"
                />
              </HStack>
            </HStack>
          </Stack>

          {view ? (
            <TeamManager
              currentUserId={view.currentUserId}
              actorRole={view.actorRole}
              assignableRoles={view.assignableRoles}
              members={view.members.map((member) => ({
                id: member.id,
                userId: member.userId,
                name: member.name,
                email: member.email,
                role: member.role,
                joinedAt: member.createdAt.toISOString(),
              }))}
              invitations={view.invitations.map((invitation) => ({
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt.toISOString(),
              }))}
            />
          ) : (
            <Card padding={5}>
              <Stack gap={1}>
                <Heading level={2}>{t("membersRestrictedTitle")}</Heading>
                <Text color="secondary">{t("membersRestrictedBody")}</Text>
              </Stack>
            </Card>
          )}
        </Stack>
      </Center>
    </Section>
  );
}
