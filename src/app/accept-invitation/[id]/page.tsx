import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {getActorContext} from "@/server/auth/actor";
import {invitationService} from "@/server/services/container";
import {isOrgRole} from "@/lib/permissions";
import {PropertyList} from "@/components/layout/property-list";
import {AcceptInvitationButton} from "@/components/accept-invitation-button";
import {AuthStatus} from "@/components/auth-status";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type AcceptInvitationParams = {params: Promise<{id: string}>};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invitation");

  return {title: t("metadataTitle")};
}

export default async function AcceptInvitationPage({
  params,
}: AcceptInvitationParams) {
  const {id} = await params;
  const t = await getTranslations("Invitation");
  const tRoles = await getTranslations("Roles");
  const viewer = await getActorContext();
  const view = await invitationService.getInvitationView(viewer, id);

  if (!view) notFound();

  const {invitation, state} = view;
  const roleLabel = isOrgRole(invitation.role)
    ? tRoles(`${invitation.role}.label`)
    : invitation.role;
  const inviter = invitation.inviter.name || invitation.inviter.email;

  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={4} width="100%" maxWidth={520}>
        <HStack justify="between" align="center" wrap="wrap">
          <Link href="/">{t("home")}</Link>
        </HStack>

        <Card padding={6}>
          <Stack gap={5}>
            <Stack gap={1}>
              <Text type="label" color="accent">
                {invitation.organization.name}
              </Text>
              <Heading level={1}>
                {t("title", {organization: invitation.organization.name})}
              </Heading>
              <Text type="supporting">
                {t("intro", {
                  inviter,
                  email: invitation.email,
                  organization: invitation.organization.name,
                  role: roleLabel,
                })}
              </Text>
            </Stack>

            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {label: t("fields.email"), value: invitation.email},
                {label: t("fields.role"), value: roleLabel},
                {label: t("fields.inviter"), value: inviter},
              ]}
            />

            {state === "accepted" ? (
              <Banner status="info" title={t("accepted")} />
            ) : state === "unavailable" ? (
              <Banner status="info" title={t("cancelled")} />
            ) : state === "expired" ? (
              <Banner status="warning" title={t("expired")} />
            ) : state === "unauthenticated" ? (
              <Stack gap={3}>
                <Text>{t("signInPrompt", {email: invitation.email})}</Text>
                <HStack gap={3} wrap="wrap">
                  <Button
                    href={`/sign-in?next=/accept-invitation/${invitation.id}`}
                    variant="primary"
                    label={t("signIn")}
                  />
                  <Button
                    href={`/sign-up?next=/accept-invitation/${invitation.id}`}
                    variant="secondary"
                    label={t("signUp")}
                  />
                </HStack>
              </Stack>
            ) : state === "wrong-account" ? (
              <Stack gap={3}>
                <Banner
                  status="warning"
                  title={t("wrongAccount", {email: invitation.email})}
                />
                <AuthStatus />
              </Stack>
            ) : (
              <Stack gap={3}>
                <AcceptInvitationButton invitationId={invitation.id} />
                <Link href="/">{t("decline")}</Link>
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </Center>
  );
}
