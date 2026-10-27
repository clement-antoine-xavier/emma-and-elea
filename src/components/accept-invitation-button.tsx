"use client";

import {useState} from "react";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  acceptInvitationAction,
  type InvitationActionError,
} from "@/app/actions/invitation.actions";

export function AcceptInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const t = useTranslations("Invitation");
  const router = useRouter();
  const [error, setError] = useState<InvitationActionError | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  function errorMessage(code: InvitationActionError): string {
    switch (code) {
      case "expired":
        return t("expired");
      case "unavailable":
        return t("cancelled");
      case "wrongAccount":
        return t("wrongAccountGeneric");
      default:
        return t("error");
    }
  }

  async function accept() {
    setError(null);
    setIsAccepting(true);

    const result = await acceptInvitationAction({invitationId});

    setIsAccepting(false);

    if (!result.ok) {
      setError(result.error);
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
          description={errorMessage(error)}
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
