import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import {DomainError} from "@/server/domain/errors";
import type {OrganizationActor} from "@/server/auth/types";
import {isGranted} from "@/server/auth/guards";
import {isBlobConfigured} from "@/server/storage/blob-config";
import type {BlobStorage} from "@/server/storage/blob-storage";

const MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type ProfileImageKind = "logo" | "avatar";

export interface ProfileImageService {
  upload(
    actor: OrganizationActor,
    input: {kind: ProfileImageKind; file: File},
    headers: Headers,
  ): Promise<{url: string}>;
  isEnabled(): boolean;
}

function validate(file: File): string {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new DomainError("INVALID_INPUT", "UNSUPPORTED_IMAGE_TYPE");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new DomainError("INVALID_INPUT", "IMAGE_TOO_LARGE");
  }

  return file.type;
}

function isManagedBlob(url: string | null | undefined): url is string {
  return Boolean(
    url && url.includes(".blob.vercel-storage.com/"),
  );
}

export function createProfileImageService(deps: {
  blobStorage: BlobStorage;
  authGateway: BetterAuthGateway;
}): ProfileImageService {
  async function upload(
    actor: OrganizationActor,
    input: {kind: ProfileImageKind; file: File},
    headers: Headers,
  ): Promise<{url: string}> {
    if (!isBlobConfigured()) {
      throw new DomainError("UNEXPECTED", "UPLOAD_UNAVAILABLE");
    }

    const contentType = validate(input.file);

    if (input.kind === "logo") {
      if (!isGranted(actor, "organization:update")) {
        throw new DomainError("FORBIDDEN");
      }

      const uploaded = await deps.blobStorage.putImage({
        pathname: `organizations/${actor.organizationId}/logo`,
        file: input.file,
        contentType,
      });

      try {
        await deps.authGateway.updateOrganizationLogo(
          {organizationId: actor.organizationId, logo: uploaded.url},
          headers,
        );
      } catch (error) {
        await deps.blobStorage.delete(uploaded.url).catch(() => undefined);
        throw error;
      }

      const previous = actor.organization.logo;
      if (isManagedBlob(previous) && previous !== uploaded.url) {
        await deps.blobStorage.delete(previous).catch(() => undefined);
      }

      return {url: uploaded.url};
    }

    const uploaded = await deps.blobStorage.putImage({
      pathname: `users/${actor.userId}/avatar`,
      file: input.file,
      contentType,
    });

    try {
      await deps.authGateway.updateUserImage({image: uploaded.url}, headers);
    } catch (error) {
      await deps.blobStorage.delete(uploaded.url).catch(() => undefined);
      throw error;
    }

    if (isManagedBlob(actor.image) && actor.image !== uploaded.url) {
      await deps.blobStorage.delete(actor.image).catch(() => undefined);
    }

    return {url: uploaded.url};
  }

  return {
    upload,
    isEnabled: isBlobConfigured,
  };
}
