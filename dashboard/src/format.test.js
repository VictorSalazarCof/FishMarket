import { describe, expect, it } from "vitest";
import { fmtInt, fmtMoney, fmtMoneyFull, fmtPct, niceMax } from "./format";

describe("format", () => {
  it("fmtMoney compacts large numbers", () => {
    expect(fmtMoney(1500)).toBe("$1.5K");
    expect(fmtMoney(2_300_000)).toBe("$2.3M");
    expect(fmtMoney(950)).toBe("$950");
    expect(fmtMoney(undefined)).toBe("—");
  });

  it("fmtMoneyFull renders the full CLP-formatted amount", () => {
    expect(fmtMoneyFull(1234567)).toBe("$1.234.567");
    expect(fmtMoneyFull(null)).toBe("—");
  });

  it("fmtInt renders localized integers", () => {
    expect(fmtInt(342)).toBe("342");
    expect(fmtInt(NaN)).toBe("—");
  });

  it("fmtPct converts a 0..1 rate to a percentage string", () => {
    expect(fmtPct(0.967)).toBe("96.7%");
    expect(fmtPct(undefined)).toBe("—");
  });

  it("niceMax rounds up to a clean chart-axis ceiling", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(43)).toBe(50);
    expect(niceMax(120)).toBe(200);
  });
});
