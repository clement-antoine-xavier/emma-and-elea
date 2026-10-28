"use client";

import {useState} from "react";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {authClient} from "@/lib/auth-client";

type ConsentFormProps = {
  clientName: string;
  clientUri: string | null;
  organizationName: string;
  scopes: string[];
};

const KNOWN_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "api:read",
  "api:write",
  "api:execute",
  "api:finance",
] as const;

type KnownScope = (typeof KNOWN_SCOPES)[number];

function isKnownScope(scope: string): scope is KnownScope {
  return (KNOWN_SCOPES as readonly string[]).includes(scope);
}

export function ConsentForm({
  clientName,
  clientUri,
  organizationName,
  scopes,
}: ConsentFormProps) {
  const t = useTranslations("Consent");
  const tScopes = useTranslations("Consent.scopes");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);

  async function decide(accept: boolean) {
    setError(null);
    setPending(accept ? "accept" : "deny");

    try {
      const result = await authClient.oauth2.consent({
        accept,
        scope: accept ? scopes.join(" ") : undefined,
      });

      if (result.error) {
        setError(result.error.message ?? t("errors.generic"));
        return;
      }

      const url = (result.data as {url?: string} | null)?.url;
      if (url) {
        window.location.assign(url);
        return;
      }

      setError(t("errors.generic"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.generic"));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card padding={6} width="100%">
      <Stack gap={5}>
        <Stack gap={1}>
          <Heading level={1}>{t("title")}</Heading>
          <Text type="supporting">
            {t("subtitle", {client: clientName})}
          </Text>
        </Stack>

        {error ? (
          <Banner
            status="error"
            title={t("errors.title")}
            description={error}
          />
        ) : null}

        <Stack gap={2}>
          <Text weight="medium">{t("accountLabel")}</Text>
          <Text type="supporting">
            {t("accountValue", {organization: organizationName})}
          </Text>
        </Stack>

        <Stack gap={2}>
          <Text weight="medium">{t("scopesLabel")}</Text>
          <Stack gap={1} as="ul">
            {scopes.map((scope) => (
              <li key={scope}>
                <Text type="supporting">
                  {isKnownScope(scope) ? tScopes(scope) : scope}
                </Text>
              </li>
            ))}
          </Stack>
        </Stack>

        {clientUri ? (
          <Text type="supporting">{t("clientLink", {uri: clientUri})}</Text>
        ) : null}

        <HStack gap={3} justify="end" wrap="wrap">
          <Button
            type="button"
            variant="secondary"
            label={t("deny")}
            onClick={() => void decide(false)}
            isLoading={pending === "deny"}
            isDisabled={pending !== null}
          />
          <Button
            type="button"
            variant="primary"
            label={t("accept")}
            onClick={() => void decide(true)}
            isLoading={pending === "accept"}
            isDisabled={pending !== null}
          />
        </HStack>
      </Stack>
    </Card>
  );
}
