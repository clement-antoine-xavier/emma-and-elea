import {forecastQuantity} from "./forecast";

const target = new Date("2026-10-27T00:00:00.000Z"); // Tuesday
const from = new Date("2026-09-08T00:00:00.000Z"); // 7 weeks before
const to = new Date("2026-10-26T00:00:00.000Z"); // Monday

describe("forecastQuantity", () => {
  it("averages the same weekday when it has sales", () => {
    const result = forecastQuantity({
      targetDate: target,
      from,
      to,
      history: [
        {businessDate: new Date("2026-10-20T00:00:00.000Z"), quantity: "12"},
        {businessDate: new Date("2026-10-06T00:00:00.000Z"), quantity: "8"},
        {businessDate: new Date("2026-10-21T00:00:00.000Z"), quantity: "99"},
      ],
      safetyPct: "0",
    });

    // 20/7 weeks, the other Tuesdays count as zero-sale days.
    expect(result.basis).toBe("WEEKDAY");
    expect(result.historyQuantity.toFixed(4)).toBe("119.0000");
    expect(result.averageQuantity.toFixed(4)).toBe("2.8571");
    expect(result.suggestedQuantity.toFixed(4)).toBe("2.8571");
  });

  it("falls back to the overall daily average without weekday sales", () => {
    const result = forecastQuantity({
      targetDate: target,
      from: new Date("2026-10-21T00:00:00.000Z"),
      to: new Date("2026-10-26T00:00:00.000Z"),
      history: [
        {businessDate: new Date("2026-10-21T00:00:00.000Z"), quantity: "7"},
        {businessDate: new Date("2026-10-22T00:00:00.000Z"), quantity: "11"},
      ],
      safetyPct: "0",
    });

    expect(result.basis).toBe("AVERAGE");
    expect(result.averageQuantity.toFixed(4)).toBe("3.0000");
  });

  it("applies the safety buffer and event uplift together", () => {
    const result = forecastQuantity({
      targetDate: target,
      from: new Date("2026-10-19T00:00:00.000Z"),
      to: new Date("2026-10-25T00:00:00.000Z"),
      history: [
        {businessDate: new Date("2026-10-20T00:00:00.000Z"), quantity: "20"},
      ],
      safetyPct: "5",
      eventUpliftPct: "10",
    });

    // One Tuesday in the window: 20 × 1.15.
    expect(result.suggestedQuantity.toFixed(4)).toBe("23.0000");
  });

  it("returns zero when there is no sales history", () => {
    const result = forecastQuantity({
      targetDate: target,
      from,
      to,
      history: [],
      safetyPct: "10",
    });

    expect(result.basis).toBe("NONE");
    expect(result.suggestedQuantity.toFixed(4)).toBe("0.0000");
  });

  it("does not suggest a negative quantity for a strong negative event", () => {
    const result = forecastQuantity({
      targetDate: target,
      from,
      to,
      history: [
        {businessDate: new Date("2026-10-20T00:00:00.000Z"), quantity: "10"},
      ],
      safetyPct: "0",
      eventUpliftPct: "-150",
    });

    expect(result.suggestedQuantity.toFixed(4)).toBe("0.0000");
  });
});
