"use client";

import {useState} from "react";
import {Avatar} from "@astryxdesign/core/Avatar";
import {Banner} from "@astryxdesign/core/Banner";
import {Card} from "@astryxdesign/core/Card";
import {FileInput} from "@astryxdesign/core/FileInput";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

const MAX_BYTES = 2 * 1024 * 1024;

export function OrganizationLogoForm({
  logo,
  organizationName,
}: {
  logo: string | null;
  organizationName: string;
}) {
  const t = useTranslations("Settings.organization.logo");
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(next: File | File[] | null) {
    const selected = Array.isArray(next) ? next[0] : next;
    if (!selected) return;

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.set("kind", "logo");
      body.set("file", selected);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {error?: string}
          | null;
        setError(t(payload?.error === "UPLOAD_UNAVAILABLE" ? "unavailable" : "error"));
        return;
      }

      setFile(null);
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card padding={5}>
      <Stack gap={4}>
        <Stack gap={1}>
          <Heading level={2}>{t("title")}</Heading>
          <Text type="supporting">{t("intro")}</Text>
        </Stack>

        {error ? <Banner status="error" title={error} /> : null}

        <HStack gap={4} vAlign="center">
          <Avatar
            src={logo ?? undefined}
            name={organizationName}
            size="xl"
            shape="rounded"
          />
          <Stack gap={2}>
            <FileInput
              label={t("label")}
              value={file}
              onChange={(files) =>
                setFile(Array.isArray(files) ? (files[0] ?? null) : files)
              }
              changeAction={upload}
              accept="image/png,image/jpeg,image/webp"
              maxSize={MAX_BYTES}
              mode="dropzone"
              isLoading={isUploading}
              description={t("hint")}
            />
          </Stack>
        </HStack>
      </Stack>
    </Card>
  );
}
