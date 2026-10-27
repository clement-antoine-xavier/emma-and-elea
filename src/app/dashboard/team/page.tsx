import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {requirePermission} from "@/server/auth/actor";
import {teamService} from "@/server/services/container";
import {TeamManager} from "@/components/team-manager";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team");

  return {title: t("metadataTitle")};
}

export default async function TeamPage() {
  const actor = await requirePermission("member:read");
  const t = await getTranslations("Team");
  const view = await teamService.getTeamView(actor);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <Stack gap={2}>
            <Heading level={1} type="display-3">
              {t("title")}
            </Heading>
            <Text type="large" color="secondary">
              {t("intro", {organization: actor.organization.name})}
            </Text>
          </Stack>

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
        </Stack>
      </Center>
    </Section>
  );
}
