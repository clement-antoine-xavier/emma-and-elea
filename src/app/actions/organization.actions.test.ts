import {headers} from "next/headers";
import {getActorContext} from "@/server/auth/actor";
import {organizationService} from "@/server/services/container";
import {createOrganizationAction} from "@/app/actions/organization.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("next/headers", () => ({headers: jest.fn()}));
jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  organizationService: {createOrganization: jest.fn()},
}));

const getActor = getActorContext as jest.Mock;
const createOrganization = organizationService.createOrganization as jest.Mock;
const headersMock = headers as unknown as jest.Mock;

const input = {
  name: "Bakery",
  slug: "bakery",
  siteName: "Atelier",
  siteCode: "atl",
};

beforeEach(() => {
  jest.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
});

describe("createOrganizationAction", () => {
  it("rejects a visitor", async () => {
    getActor.mockResolvedValue(null);

    await expect(createOrganizationAction(input)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it("rejects invalid input before calling the service", async () => {
    getActor.mockResolvedValue(actorFor());

    await expect(
      createOrganizationAction({...input, slug: "Not A Slug"}),
    ).resolves.toEqual({ok: false, error: "invalid"});
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it("creates the organization and returns the summary", async () => {
    getActor.mockResolvedValue(actorFor());
    createOrganization.mockResolvedValue({
      id: "org_1",
      name: "Bakery",
      slug: "bakery",
    });

    await expect(createOrganizationAction(input)).resolves.toEqual({
      ok: true,
      organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    });
    expect(createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({userId: "user_1"}),
      {
        name: "Bakery",
        slug: "bakery",
        siteName: "Atelier",
        siteCode: "ATL",
      },
      expect.any(Headers),
    );
  });

  it("maps a slug conflict", async () => {
    getActor.mockResolvedValue(actorFor());
    createOrganization.mockRejectedValue(new DomainError("CONFLICT"));

    await expect(createOrganizationAction(input)).resolves.toEqual({
      ok: false,
      error: "slugTaken",
    });
  });

  it("maps forbidden and unexpected failures", async () => {
    getActor.mockResolvedValue(actorFor());

    createOrganization.mockRejectedValue(new DomainError("FORBIDDEN"));
    await expect(createOrganizationAction(input)).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });

    createOrganization.mockRejectedValue(new DomainError("UNEXPECTED"));
    await expect(createOrganizationAction(input)).resolves.toEqual({
      ok: false,
      error: "generic",
    });

    createOrganization.mockRejectedValue(new Error("boom"));
    await expect(createOrganizationAction(input)).resolves.toEqual({
      ok: false,
      error: "generic",
    });
  });
});
