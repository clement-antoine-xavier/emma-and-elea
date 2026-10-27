import {cookies} from "next/headers";
import {setLocaleAction} from "@/app/actions/locale.actions";
import {localeCookieName, localeCookieOptions} from "@/i18n/locale";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const cookiesMock = cookies as unknown as jest.Mock;
const set = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  cookiesMock.mockResolvedValue({set});
});

describe("setLocaleAction", () => {
  it("persists a supported locale", async () => {
    await expect(setLocaleAction("fr")).resolves.toEqual({ok: true});

    expect(set).toHaveBeenCalledWith(
      localeCookieName,
      "fr",
      localeCookieOptions,
    );
  });

  it("rejects an unsupported locale without writing a cookie", async () => {
    await expect(setLocaleAction("de")).resolves.toEqual({ok: false});
    await expect(setLocaleAction("")).resolves.toEqual({ok: false});

    expect(set).not.toHaveBeenCalled();
  });
});
