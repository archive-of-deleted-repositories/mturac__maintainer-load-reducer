import { describe, expect, it } from "vitest";
import { analyzePR, generateReviewReport, SAMPLE_DIFF, SAMPLE_FILES } from "./reviewer";

describe("maintainer-load-reducer", () => {
  it("detects high risk auth change", () => {
    const a = analyzePR({ diff: SAMPLE_DIFF, files: SAMPLE_FILES });
    expect(a.riskLevel).toBe("high");
  });

  it("flags missing tests", () => {
    const a = analyzePR({ diff: SAMPLE_DIFF, files: SAMPLE_FILES, hasTestChanges: false });
    expect(a.missingTests.length).toBeGreaterThan(0);
  });

  it("passes with test changes", () => {
    const a = analyzePR({ diff: SAMPLE_DIFF, files: SAMPLE_FILES, hasTestChanges: true });
    expect(a.missingTests.length).toBeLessThan(2);
  });

  it("generates checklist", () => {
    const a = analyzePR({ diff: SAMPLE_DIFF, files: SAMPLE_FILES });
    expect(a.checklist.length).toBeGreaterThan(0);
  });

  it("detects auth area", () => {
    const a = analyzePR({ diff: SAMPLE_DIFF, files: SAMPLE_FILES });
    expect(a.touchedAreas).toContain("authentication");
  });

  it("generates markdown report", () => {
    const md = generateReviewReport(analyzePR({ diff: SAMPLE_DIFF, files: SAMPLE_FILES }), "Fix auth");
    expect(md).toContain("HIGH");
  });

  it("low risk for docs only", () => {
    const a = analyzePR({ diff: "readme update", files: ["README.md"], hasTestChanges: false });
    expect(a.riskLevel).toBe("low");
  });

  it("detects breaking API changes", () => {
    const a = analyzePR({ diff: "export function newApi()", files: ["src/api.ts"] });
    expect(a.breakingChanges.length).toBeGreaterThan(0);
  });
});