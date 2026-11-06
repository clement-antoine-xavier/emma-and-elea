"use client";

import {useState} from "react";
import {Avatar} from "@astryxdesign/core/Avatar";
import {FileInput} from "@astryxdesign/core/FileInput";
import {HStack} from "@astryxdesign/core/HStack";
import {Text} from "@astryxdesign/core/Text";
import {Stack} from "@astryxdesign/core/Stack";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

const MAX_BYTES = 2 * 1024 * 1024;

export function ProfileAvatarForm({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  const t = useTranslations("Dashboard.profile");
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
      body.set("kind", "avatar");
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
    <Stack gap={2}>
      <HStack gap={2} vAlign="center">
        <Avatar
          src={image ?? undefined}
          name={name}
          size="sm"
          tooltip={false}
        />
      </HStack>
      <FileInput
        label={t("label")}
        value={file}
        onChange={(files) =>
          setFile(Array.isArray(files) ? (files[0] ?? null) : files)
        }
        changeAction={upload}
        accept="image/png,image/jpeg,image/webp"
        maxSize={MAX_BYTES}
        width={180}
        isLoading={isUploading}
        isLabelHidden
        placeholder={t("action")}
      />
      {error ? <Text type="supporting">{error}</Text> : null}
    </Stack>
  );
}
