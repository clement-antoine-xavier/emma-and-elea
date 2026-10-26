import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {getTranslations} from "next-intl/server";
import {routing} from "@/i18n/routing";
import {Link} from "@/i18n/navigation";
import {getActorContext} from "@/server/auth/actor";
import {invitationService} from "@/server/services/container";
import {isOrgRole} from "@/lib/permissions";
import {AcceptInvitationButton} from "@/components/accept-invitation-button";
import {AuthStatus} from "@/components/auth-status";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type LocaleParams = {params: Promise<{locale: string; id: string}>};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: "Invitation"});

  return {title: t("metadataTitle")};
}

export default async function AcceptInvitationPage({params}: LocaleParams) {
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

  return (
    <Center minHeight="100vh" padding={8}>
      <Card padding={6} width="100%" maxWidth={520}>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={1}>
              {t("title", {organization: invitation.organization.name})}
            </Heading>
            <Text type="supporting">
              {t("intro", {
                inviter:
                  invitation.inviter.name || invitation.inviter.email,
                email: invitation.email,
                organization: invitation.organization.name,
                role: roleLabel,
              })}
            </Text>
          </Stack>

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
    </Center>
  );
}
