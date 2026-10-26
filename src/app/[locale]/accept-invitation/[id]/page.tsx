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
import {getAccessContext} from "@/lib/access";
import {isOrgRole} from "@/lib/permissions";
import {prisma} from "@/lib/prisma";
import {AcceptInvitationButton} from "@/components/accept-invitation-button";
import {AuthStatus} from "@/components/auth-status";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
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

  const invitation = await prisma.invitation.findUnique({
    where: {id},
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {select: {name: true}},
      user: {select: {name: true, email: true}},
    },
  });

  if (!invitation) notFound();

  const context = await getAccessContext();
  const invitationRole = invitation.role ?? "staff";
  const roleLabel = isOrgRole(invitationRole)
    ? tRoles(`${invitationRole}.label`)
    : invitationRole;
  // Server component: the comparison is stable for this request.
  // eslint-disable-next-line react-hooks/purity
  const isExpired = invitation.expiresAt.getTime() <= Date.now();
  const isPending = invitation.status === "pending" && !isExpired;
  const signedInEmail = context?.user.email.toLowerCase();
  const isRecipient =
    signedInEmail !== undefined &&
    signedInEmail === invitation.email.toLowerCase();

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
                inviter: invitation.user.name || invitation.user.email,
                email: invitation.email,
                organization: invitation.organization.name,
                role: roleLabel,
              })}
            </Text>
          </Stack>

          {invitation.status !== "pending" ? (
            <Banner
              status="info"
              title={
                invitation.status === "accepted"
                  ? t("accepted")
                  : t("cancelled")
              }
            />
          ) : isExpired ? (
            <Banner status="warning" title={t("expired")} />
          ) : context === null ? (
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
          ) : !isRecipient ? (
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

          {isPending && context !== null && !isRecipient ? (
            <Text type="supporting">
              {t("signInPrompt", {email: invitation.email})}
            </Text>
          ) : null}
        </Stack>
      </Card>
    </Center>
  );
}
