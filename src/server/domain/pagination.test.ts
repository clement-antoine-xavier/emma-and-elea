import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePage,
} from "@/server/domain/pagination";

describe("normalizePage", () => {
  it("defaults to the first page", () => {
    expect(normalizePage()).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("reads page and page size from query strings", () => {
    expect(normalizePage({page: "3", pageSize: "10"})).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it("clamps invalid values instead of querying unbounded rows", () => {
    expect(normalizePage({page: "-4", pageSize: "0"})).toEqual({
      page: 1,
      pageSize: 1,
      skip: 0,
      take: 1,
    });

    expect(normalizePage({page: "abc", pageSize: "9999"})).toEqual({
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      skip: 0,
      take: MAX_PAGE_SIZE,
    });
  });

  it("honours a caller-specific page size window", () => {
    expect(
      normalizePage({page: "2", pageSize: "50"}, {defaultSize: 20, maxSize: 40}),
    ).toEqual({page: 2, pageSize: 40, skip: 40, take: 40});
  });
});
