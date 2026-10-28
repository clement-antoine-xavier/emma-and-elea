import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {Center} from "@astryxdesign/core/Center";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {isApiScope, narrowScopesToRole} from "@/lib/scopes";
import {getActorContext} from "@/server/auth/actor";
import {
  getPublicOAuthClient,
  verifyConsentQuery,
} from "@/server/auth/oauth-consent";
import {ConsentForm} from "@/components/consent-form";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";

// The signed query and the session are request data, so the page renders per
// request.
export const instant = false;

type ConsentSearchParams = Record<string, string | string[] | undefined>;

type ConsentPageProps = {
  searchParams: Promise<ConsentSearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Consent");

  return {title: t("metadataTitle")};
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * Rebuilds the query string the provider signed. `URLSearchParams` keeps
 * repeated keys (the provider signs `ba_param` once per parameter), and the
 * signature check canonicalizes the pairs, so their order does not matter.
 */
function buildQuery(params: ConsentSearchParams): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry);
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }

  return query.toString();
}

function splitScopes(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

export default async function ConsentPage({searchParams}: ConsentPageProps) {
  const params = await searchParams;
  const query = buildQuery(params);
  const t = await getTranslations("Consent");

  // Preserve the signed authorization query across a session that expired
  // before consent: the provider resumes from it after sign-in.
  const actor = await getActorContext();
  if (!actor) {
    redirect(`/sign-in?${query}`);
  }

  if (!(await verifyConsentQuery(query))) {
    return (
      <Center minHeight="100vh" padding={8}>
        <Card padding={6} width="100%" maxWidth={440}>
          <Stack gap={3}>
            <Heading level={1}>{t("errors.title")}</Heading>
            <Text type="supporting">{t("errors.invalidQuery")}</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  const clientId = first(params.client_id);
  const requestedScopes = splitScopes(first(params.scope));
  const organizationName = actor.organization?.name ?? t("unknownOrganization");

  // An unknown client is shown by id; the provider rejects the exchange later
  // if it really does not exist.
  const client = clientId ? await getPublicOAuthClient(clientId) : null;
  const clientName = client?.name ?? clientId;
  const clientUri = client?.uri ?? null;

  const requestedApiScopes = requestedScopes.filter(isApiScope);
  const grantedApiScopes = narrowScopesToRole(actor.role, requestedApiScopes);
  const passThroughScopes = requestedScopes.filter(
    (scope) => !isApiScope(scope),
  );

  if (requestedApiScopes.length > 0 && grantedApiScopes.length === 0) {
    return (
      <Center minHeight="100vh" padding={8}>
        <Card padding={6} width="100%" maxWidth={440}>
          <Stack gap={3}>
            <Heading level={1}>{t("errors.title")}</Heading>
            <Text type="supporting">{t("errors.roleRestricted")}</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={4} width="100%" maxWidth={480}>
        <HStack gap={4} align="center" justify="end" wrap="wrap">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </HStack>
        <ConsentForm
          clientName={clientName}
          clientUri={clientUri}
          organizationName={organizationName}
          scopes={[...passThroughScopes, ...grantedApiScopes]}
        />
      </Stack>
    </Center>
  );
}
