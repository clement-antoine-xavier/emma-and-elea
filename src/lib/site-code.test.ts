import {
  isValidSiteCode,
  normalizeSiteCode,
  siteCodeFromName,
} from "@/lib/site-code";

describe("site code", () => {
  it("derives three uppercase letters, dropping accents", () => {
    expect(siteCodeFromName("Atelier Éléa")).toBe("ATE");
    expect(siteCodeFromName("Boulangerie du Parc")).toBe("BOU");
  });

  it("falls back when the name has no usable characters", () => {
    expect(siteCodeFromName("---")).toBe("ATL");
  });

  it("normalizes and validates codes", () => {
    expect(normalizeSiteCode(" atl ")).toBe("ATL");
    expect(isValidSiteCode("ATL")).toBe(true);
    expect(isValidSiteCode("AT")).toBe(true);
    expect(isValidSiteCode("A")).toBe(false);
    expect(isValidSiteCode("ATELIER1")).toBe(true);
    expect(isValidSiteCode("ATELIER12")).toBe(false);
    expect(isValidSiteCode("AT-L")).toBe(false);
  });
});
