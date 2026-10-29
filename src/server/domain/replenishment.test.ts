import {suggestedOrderQuantity} from "./replenishment";

describe("suggestedOrderQuantity", () => {
  it("uses the par level before the minimum", () => {
    expect(
      suggestedOrderQuantity({
        onHand: "5",
        openDraftQuantity: "0",
        minStockQuantity: "10",
        parLevelQuantity: "20",
      })?.toString(),
    ).toBe("15");
  });

  it("falls back to the minimum and subtracts open drafts", () => {
    expect(
      suggestedOrderQuantity({
        onHand: "5",
        openDraftQuantity: "2",
        minStockQuantity: "10",
        parLevelQuantity: null,
      })?.toString(),
    ).toBe("3");
  });

  it("never suggests a negative quantity", () => {
    expect(
      suggestedOrderQuantity({
        onHand: "30",
        openDraftQuantity: "5",
        minStockQuantity: "10",
        parLevelQuantity: "20",
      })?.toString(),
    ).toBe("0");
  });

  it("returns null without a threshold", () => {
    expect(
      suggestedOrderQuantity({
        onHand: "5",
        openDraftQuantity: "0",
        minStockQuantity: null,
        parLevelQuantity: null,
      }),
    ).toBeNull();
  });
});
