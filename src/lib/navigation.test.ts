import {dashboardHref, safeNextPath} from "@/lib/navigation";

describe("dashboardHref", () => {
  it("maps the overview to the dashboard root", () => {
    expect(dashboardHref("overview")).toBe("/dashboard");
  });

  it("maps every other workspace area to a dashboard route", () => {
    expect(dashboardHref("catalog")).toBe("/dashboard/catalog");
    expect(dashboardHref("settings")).toBe("/dashboard/settings");
  });
});

describe("safeNextPath", () => {
  it("keeps a relative path", () => {
    expect(safeNextPath("/accept-invitation/abc")).toBe(
      "/accept-invitation/abc",
    );
    expect(safeNextPath("/dashboard?tab=team")).toBe("/dashboard?tab=team");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeNextPath("https://example.com")).toBeUndefined();
    expect(safeNextPath("//example.com")).toBeUndefined();
    expect(safeNextPath("javascript:alert(1)")).toBeUndefined();
  });

  it("rejects missing or repeated parameters", () => {
    expect(safeNextPath(undefined)).toBeUndefined();
    expect(safeNextPath(null)).toBeUndefined();
    expect(safeNextPath(["/a", "/b"])).toBeUndefined();
  });
});
