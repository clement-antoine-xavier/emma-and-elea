import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
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
    <PageShell
      title={t("title")}
      intro={t("intro", {organization: actor.organization.name})}
      actions={
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
      }
    >
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
    </PageShell>
  );
}
