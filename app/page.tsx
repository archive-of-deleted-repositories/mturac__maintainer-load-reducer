"use client";

import { useMemo, useState } from "react";
import { analyzePR, generateReviewReport, SAMPLE_DIFF, SAMPLE_FILES } from "@/lib/reviewer";

export default function Home() {
  const [diff, setDiff] = useState(SAMPLE_DIFF);
  const [files, setFiles] = useState(SAMPLE_FILES.join("\n"));
  const [hasTests, setHasTests] = useState(false);

  const analysis = useMemo(
    () => analyzePR({ diff, files: files.split("\n").filter(Boolean), hasTestChanges: hasTests }),
    [diff, files, hasTests]
  );

  const riskColor = { low: "text-blue-400", medium: "text-yellow-400", high: "text-orange-400", critical: "text-red-400" };

  return (
    <div className="min-h-screen bg-[#100a06] text-slate-200">
      <header className="border-b border-orange-900/40">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-orange-100">maintainer-load-reducer</h1>
          <p className="text-orange-600/80 text-sm">PR risk triage & reviewer checklist — not empty AI review</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-900/30 overflow-hidden">
            <div className="px-3 py-2 text-xs text-orange-700 border-b border-orange-900/30">Diff</div>
            <textarea value={diff} onChange={(e) => setDiff(e.target.value)} rows={12} className="w-full p-3 bg-transparent font-mono text-xs resize-none focus:outline-none" />
          </div>
          <div className="rounded-xl border border-orange-900/30 overflow-hidden">
            <div className="px-3 py-2 text-xs text-orange-700 border-b border-orange-900/30">Touched Files</div>
            <textarea value={files} onChange={(e) => setFiles(e.target.value)} rows={4} className="w-full p-3 bg-transparent font-mono text-xs resize-none focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hasTests} onChange={(e) => setHasTests(e.target.checked)} className="accent-orange-500" />
            Includes test changes
          </label>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-orange-800/40 bg-orange-950/20 text-center">
            <div className={`text-4xl font-bold ${riskColor[analysis.riskLevel]}`}>{analysis.riskLevel.toUpperCase()}</div>
            <div className="text-sm text-slate-500 mt-1">Risk Score: {analysis.riskScore}/100</div>
          </div>

          <Section title="Reasons" items={analysis.reasons} />
          <Section title="Review Focus" items={analysis.checklist} numbered />
          {analysis.missingTests.length > 0 && <Section title="Missing Tests" items={analysis.missingTests} warn />}
          {analysis.rollbackConcerns.length > 0 && <Section title="Rollback Concerns" items={analysis.rollbackConcerns} warn />}

          <button onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([generateReviewReport(analysis)])); a.download = "review-report.md"; a.click(); }} className="w-full py-3 rounded-xl bg-orange-600 text-black font-semibold">
            Export Review Report
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({ title, items, numbered, warn }: { title: string; items: string[]; numbered?: boolean; warn?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${warn ? "border-red-900/40 bg-red-950/10" : "border-slate-800"}`}>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      {items.map((item, i) => (
        <div key={i} className="text-sm py-1 text-slate-400">{numbered ? `${i + 1}. ` : "• "}{item}</div>
      ))}
    </div>
  );
}