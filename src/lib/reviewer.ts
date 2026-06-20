export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PRAnalysis {
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
  checklist: string[];
  missingTests: string[];
  breakingChanges: string[];
  rollbackConcerns: string[];
  touchedAreas: string[];
}

const SENSITIVE_PATTERNS = [
  { pattern: /auth|login|session|jwt|password|token/i, area: "authentication", risk: "high" as RiskLevel },
  { pattern: /middleware/i, area: "middleware", risk: "high" as RiskLevel },
  { pattern: /migration|schema/i, area: "database", risk: "high" as RiskLevel },
  { pattern: /api\/|router|endpoint|controller/i, area: "public API", risk: "medium" as RiskLevel },
  { pattern: /package\.json|go\.mod|Cargo\.toml/i, area: "dependencies", risk: "medium" as RiskLevel },
  { pattern: /tenant|isolation|rbac|permission/i, area: "access control", risk: "high" as RiskLevel },
];

export function analyzePR(input: { diff: string; files: string[]; hasTestChanges?: boolean }): PRAnalysis {
  const reasons: string[] = [];
  const checklist: string[] = [];
  const missingTests: string[] = [];
  const breakingChanges: string[] = [];
  const rollbackConcerns: string[] = [];
  const touchedAreas: string[] = [];
  let maxRisk: RiskLevel = "low";

  const riskOrder: RiskLevel[] = ["critical", "high", "medium", "low"];
  const bump = (r: RiskLevel) => {
    if (riskOrder.indexOf(r) < riskOrder.indexOf(maxRisk)) maxRisk = r;
  };

  for (const file of input.files) {
    for (const { pattern, area, risk } of SENSITIVE_PATTERNS) {
      if (pattern.test(file)) {
        touchedAreas.push(area);
        reasons.push(`${area} touched (${file})`);
        bump(risk);
      }
    }
  }

  if (/auth|middleware/i.test(input.diff)) {
    reasons.push("auth middleware changed");
    checklist.push("Verify backward compatibility");
    checklist.push("Check auth bypass edge cases");
    checklist.push("Validate tenant isolation");
    bump("high");
  }

  if (input.diff.includes("export ") || input.diff.includes("public ")) {
    breakingChanges.push("Public API surface may have changed");
    checklist.push("Confirm semver / migration path");
    bump("medium");
  }

  if (!input.hasTestChanges && touchedAreas.length > 0) {
    missingTests.push("No test changes detected for sensitive areas");
    reasons.push("no regression test");
    bump("high");
  }

  if (/migration/i.test(input.diff)) {
    rollbackConcerns.push("Database migration may not be reversible");
    checklist.push("Verify rollback procedure");
    bump("high");
  }

  if (touchedAreas.includes("authentication") && !input.diff.includes("test")) {
    missingTests.push("Auth changes without visible test updates");
  }

  if (checklist.length === 0) {
    checklist.push("Standard code review");
    checklist.push("Verify CI passes");
  }

  const riskScore = { critical: 95, high: 75, medium: 50, low: 20 }[maxRisk];

  return {
    riskLevel: maxRisk,
    riskScore,
    reasons: [...new Set(reasons)],
    checklist: [...new Set(checklist)],
    missingTests,
    breakingChanges,
    rollbackConcerns,
    touchedAreas: [...new Set(touchedAreas)],
  };
}

export function generateReviewReport(analysis: PRAnalysis, prTitle = "PR"): string {
  return [
    `# Maintainer Review — ${prTitle}`,
    "",
    `**Risk:** ${analysis.riskLevel.toUpperCase()} (${analysis.riskScore}/100)`,
    "",
    "## Reasons",
    ...analysis.reasons.map((r) => `- ${r}`),
    "",
    "## Review Focus",
    ...analysis.checklist.map((c, i) => `${i + 1}. ${c}`),
    "",
    analysis.missingTests.length ? "## Missing Tests\n" + analysis.missingTests.map((t) => `- ${t}`).join("\n") : "",
    analysis.breakingChanges.length ? "\n## Breaking Changes\n" + analysis.breakingChanges.map((b) => `- ${b}`).join("\n") : "",
    analysis.rollbackConcerns.length ? "\n## Rollback Concerns\n" + analysis.rollbackConcerns.map((r) => `- ${r}`).join("\n") : "",
  ].filter(Boolean).join("\n");
}

export const SAMPLE_DIFF = `diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
--- a/src/middleware/auth.ts
+++ b/src/middleware/auth.ts
@@ -10,6 +10,10 @@ export function authMiddleware(req) {
+  if (req.headers['x-bypass']) return next();
   const token = req.headers.authorization;
`;
export const SAMPLE_FILES = ["src/middleware/auth.ts", "src/routes/api.ts"];