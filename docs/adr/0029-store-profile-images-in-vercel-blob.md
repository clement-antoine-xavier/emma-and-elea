# 0029. Store profile images in Vercel Blob

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-11-06

## Context and Problem Statement

The application had URL columns for an organization logo and a user image but no
way to upload either. A Vercel deployment has no writable local filesystem and
should not serve tenant assets from the repository.

Where should uploaded profile images live, and how do we keep them tenant-scoped?

## Decision Drivers

- Vercel functions are ephemeral.
- Images are public presentation assets, not sensitive documents.
- Uploads must be authorized by the same organization actor as the rest of the app.
- Replacing an image should not leave stale cached URLs.
- Local development must work without a Vercel deployment.

## Considered Options

- Store files in `public/` and commit them
- Store bytes in PostgreSQL
- Store files on a local volume in Docker only
- Use Vercel Blob

## Decision Outcome

Chosen option: "Use Vercel Blob".

- `@vercel/blob` stores public images with `addRandomSuffix`, so every replacement
  gets a new URL and old CDN entries do not need invalidation.
- Paths are tenant-scoped: `organizations/{organizationId}/logo` and
  `users/{userId}/avatar`.
- `POST /api/uploads` resolves the session actor, validates the kind, MIME type
  and a 2 MB limit, then calls `profileImageService`.
- The service updates `Organization.logo` or `User.image` through the Better Auth
  gateway, and deletes the previous managed Blob URL after a successful update.
- Vercel uses OIDC (`BLOB_STORE_ID` plus `VERCEL_OIDC_TOKEN`); local development
  uses `BLOB_READ_WRITE_TOKEN` from `vercel env pull` or the store settings.
- Uploads fail closed with `UPLOAD_UNAVAILABLE` when no Blob credentials exist.

### Positive Consequences

- No writable disk is required in production.
- Public images are served by the Blob CDN, not by a function.
- The tenant path and the organization actor make cross-tenant writes explicit.
- Replacing an image is cache-safe.

### Negative Consequences

- Stored URLs are public; sensitive documents need a future private-Blob flow.
- The app needs a Blob store in addition to the database and model provider.
- A server-side upload is limited by the function request body size; larger files
  would need client uploads with `handleUpload`.

## Links

- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- ADR-0028 (Vercel deployment)
