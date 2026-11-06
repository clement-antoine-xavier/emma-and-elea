import {createProfileImageService} from "./profile-image.service";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {BlobStorage} from "@/server/storage/blob-storage";
import {actorFor} from "@/test-utils/actor";

const original = {...process.env};

function file(type = "image/png", size = 1024): File {
  return new File([new Uint8Array(size)], "photo", {type});
}

function setup() {
  const blobStorage: BlobStorage = {
    putImage: jest.fn(async ({pathname}) => ({
      url: `https://store.public.blob.vercel-storage.com/${pathname}-new`,
      pathname,
    })),
    delete: jest.fn(async () => undefined),
  };
  const authGateway = {
    updateOrganizationLogo: jest.fn(async () => undefined),
    updateUserImage: jest.fn(async () => undefined),
  } as unknown as BetterAuthGateway;
  const service = createProfileImageService({blobStorage, authGateway});

  return {service, blobStorage, authGateway};
}

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
});

afterEach(() => {
  process.env = {...original};
});

test("uploads an organization logo and replaces an older managed blob", async () => {
  const {service, blobStorage, authGateway} = setup();
  const actor = actorFor("owner", {
    organization: {
      id: "org_1",
      name: "Bakery",
      slug: "bakery",
      logo:
        "https://store.public.blob.vercel-storage.com/organizations/org_1/logo-old",
    },
  });

  await expect(
    service.upload(actor, {kind: "logo", file: file()}, new Headers()),
  ).resolves.toEqual({
    url: "https://store.public.blob.vercel-storage.com/organizations/org_1/logo-new",
  });

  expect(blobStorage.putImage).toHaveBeenCalledWith({
    pathname: "organizations/org_1/logo",
    file: expect.any(File),
    contentType: "image/png",
  });
  expect(authGateway.updateOrganizationLogo).toHaveBeenCalledWith(
    {
      organizationId: "org_1",
      logo: "https://store.public.blob.vercel-storage.com/organizations/org_1/logo-new",
    },
    expect.any(Headers),
  );
  expect(blobStorage.delete).toHaveBeenCalledWith(
    "https://store.public.blob.vercel-storage.com/organizations/org_1/logo-old",
  );
});

test("does not let a staff member change the organization logo", async () => {
  const {service} = setup();

  await expect(
    service.upload(actorFor("staff"), {kind: "logo", file: file()}, new Headers()),
  ).rejects.toMatchObject({code: "FORBIDDEN"});
});

test("uploads an avatar and updates the Better Auth user", async () => {
  const {service, authGateway} = setup();

  await expect(
    service.upload(actorFor("owner"), {kind: "avatar", file: file("image/webp")}, new Headers()),
  ).resolves.toEqual({
    url: "https://store.public.blob.vercel-storage.com/users/user_1/avatar-new",
  });

  expect(authGateway.updateUserImage).toHaveBeenCalledWith(
    {
      image:
        "https://store.public.blob.vercel-storage.com/users/user_1/avatar-new",
    },
    expect.any(Headers),
  );
});

test("rejects unsupported types and oversized files", async () => {
  const {service} = setup();

  await expect(
    service.upload(
      actorFor("owner"),
      {kind: "avatar", file: file("image/gif")},
      new Headers(),
    ),
  ).rejects.toMatchObject({code: "INVALID_INPUT", message: "UNSUPPORTED_IMAGE_TYPE"});

  await expect(
    service.upload(
      actorFor("owner"),
      {kind: "avatar", file: file("image/png", 2 * 1024 * 1024 + 1)},
      new Headers(),
    ),
  ).rejects.toMatchObject({code: "INVALID_INPUT", message: "IMAGE_TOO_LARGE"});
});

test("fails closed when Blob is not configured", async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const {service} = setup();

  await expect(
    service.upload(actorFor("owner"), {kind: "avatar", file: file()}, new Headers()),
  ).rejects.toMatchObject({message: "UPLOAD_UNAVAILABLE"});
});
