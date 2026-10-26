"use client";

import {useState} from "react";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {authClient} from "@/lib/auth-client";

export function AcceptInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const t = useTranslations("Invitation");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  async function accept() {
    setError(null);
    setIsAccepting(true);

    const result = await authClient.organization.acceptInvitation({
      invitationId,
    });

    setIsAccepting(false);

    if (result.error) {
      setError(result.error.message ?? t("error"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Stack gap={3}>
      {error ? (
        <Banner
          status="error"
          title={t("error")}
          description={error}
          isDismissable
          onDismiss={() => setError(null)}
        />
      ) : null}
      <Button
        variant="primary"
        label={t("accept")}
        isLoading={isAccepting}
        onClick={accept}
      />
    </Stack>
  );
}
