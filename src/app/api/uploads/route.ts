import {headers} from "next/headers";
import {appBaseUrl} from "@/lib/app-url";
import {getActorContext} from "@/server/auth/actor";
import {assertOrganizationActor} from "@/server/auth/guards";
import {isDomainError} from "@/server/domain/errors";
import {profileImageService} from "@/server/services/container";
import type {ProfileImageKind} from "@/server/services/profile-image.service";


function json(status: number, body: unknown): Response {
  return Response.json(body, {status});
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = appBaseUrl();

  try {
    return new URL(origin).origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

function isKind(value: FormDataEntryValue | null): value is ProfileImageKind {
  return value === "logo" || value === "avatar";
}

function statusFor(error: {code?: string; message?: string}): number {
  if (error.message === "UPLOAD_UNAVAILABLE") return 503;
  if (error.code === "FORBIDDEN") return 403;
  if (error.code === "INVALID_INPUT") return 400;
  return 500;
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json(403, {error: "FORBIDDEN"});

  const actor = await getActorContext();
  if (!actor) return json(401, {error: "UNAUTHENTICATED"});

  let organizationActor;
  try {
    organizationActor = assertOrganizationActor(actor);
  } catch {
    return json(403, {error: "FORBIDDEN"});
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, {error: "INVALID_FORM"});
  }

  const kind = form.get("kind");
  const file = form.get("file");
  if (!isKind(kind) || !(file instanceof File)) {
    return json(400, {error: "INVALID_UPLOAD"});
  }

  try {
    const result = await profileImageService.upload(
      organizationActor,
      {kind, file},
      await headers(),
    );

    return json(200, result);
  } catch (error) {
    if (isDomainError(error)) {
      return json(statusFor(error), {error: error.message});
    }

    console.error("Profile image upload failed", error);
    return json(500, {error: "UNEXPECTED"});
  }
}
