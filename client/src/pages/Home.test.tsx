import { describe, expect, it } from "vitest";
import { formatDateTimeLabel, isCareRangeValid } from "./Home";

describe("照护时间段", () => {
  it("允许跨天的连续时间段", () => {
    expect(isCareRangeValid("2026-09-02T09:30", "2026-09-03T17:30")).toBe(true);
  });

  it("拒绝结束时间早于或等于开始时间", () => {
    expect(isCareRangeValid("2026-09-03T18:00", "2026-09-03T17:30")).toBe(false);
    expect(isCareRangeValid("2026-09-03T18:00", "2026-09-03T18:00")).toBe(false);
  });

  it("以中文短格式展示日期和时间", () => {
    expect(formatDateTimeLabel("2026-09-02T09:30")).toBe("9 月 2 日 · 09:30");
  });
});

describe("配置缓存边界", () => {
  it("时间范围校验只接受可解析且连续的值", () => {
    expect(isCareRangeValid("not-a-date", "2026-09-03T17:30")).toBe(false);
  });
});
