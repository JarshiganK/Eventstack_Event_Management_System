import { existsSync, mkdirSync, readFileSync } from "fs";
import { join, relative, resolve } from "path";
import puppeteer from "puppeteer";

async function generatePdf() {
  const summaryPath = resolve(process.cwd(), "coverage", "unit", "coverage-summary.json");
  if (!existsSync(summaryPath)) {
    throw new Error(`Coverage summary not found at ${summaryPath}. Run "npm run testu" first.`);
  }

  const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));

  const reportsDir = resolve(process.cwd(), "tests", "reports");
  mkdirSync(reportsDir, { recursive: true });

  const html = buildHtml(summary, "Frontend Unit Test Coverage", relativePath(summaryPath));

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("screen");
    const outputPath = join(reportsDir, "coverage-unit.pdf");
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    console.log(`Saved coverage PDF to ${outputPath}`);
  } finally {
    await browser.close();
  }
}

function formatMetric(metric) {
  return {
    pct: metric?.pct ?? 0,
    covered: metric?.covered ?? 0,
    total: metric?.total ?? 0,
  };
}

function coverageCell(metric) {
  const pct = Math.max(0, Math.min(metric.pct ?? 0, 100));
  const color = pct >= 90 ? "#16a34a" : pct >= 75 ? "#d97706" : "#dc2626";
  return `
    <div class="metric">
      <span class="metric__value">${pct.toFixed(2)}%</span>
      <div class="metric__bar">
        <div class="metric__bar-fill" style="width: ${pct}%; background: ${color};"></div>
      </div>
    </div>`;
}

function relativePath(pathname) {
  const rel = relative(process.cwd(), pathname);
  return rel && !rel.startsWith("..") ? rel : pathname;
}

function buildHtml(summary, title, notePath) {
  const totals = summary.total ?? {};
  const metrics = [
    ["Statements", formatMetric(totals.statements)],
    ["Branches", formatMetric(totals.branches)],
    ["Functions", formatMetric(totals.functions)],
    ["Lines", formatMetric(totals.lines)],
  ];

  const fileRows = Object.entries(summary)
    .filter(([key]) => key !== "total")
    .map(([key, value]) => {
      const relPath = relativePath(key);
      return {
        path: relPath,
        stats: {
          statements: formatMetric(value.statements),
          branches: formatMetric(value.branches),
          functions: formatMetric(value.functions),
          lines: formatMetric(value.lines),
        },
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const totalsTableRows = metrics
    .map(
      ([label, metric]) => `
      <tr>
        <th scope="row">${label}</th>
        <td>${coverageCell(metric)}</td>
        <td>${metric.covered} / ${metric.total}</td>
      </tr>`,
    )
    .join("");

  const filesTableRows = fileRows
    .map(
      row => `
    <tr>
      <td class="file-path">${row.path}</td>
      <td>${coverageCell(row.stats.statements)}</td>
      <td>${coverageCell(row.stats.branches)}</td>
      <td>${coverageCell(row.stats.functions)}</td>
      <td>${coverageCell(row.stats.lines)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        margin: 24px;
        color: #1f2933;
      }
      h1, h2 {
        margin-bottom: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 24px;
      }
      th, td {
        border: 1px solid #d9e2ec;
        padding: 8px 12px;
        text-align: left;
      }
      th {
        background: #f5f7fa;
      }
      tbody tr:nth-child(even) {
        background: #f9fbfd;
      }
      .file-path {
        font-family: "Courier New", monospace;
        word-break: break-all;
      }
      .note {
        font-size: 12px;
        color: #52606d;
      }
      .metric {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 90px;
      }
      .metric__value {
        font-weight: 600;
      }
      .metric__bar {
        background: #e4e7eb;
        border-radius: 999px;
        height: 6px;
        overflow: hidden;
      }
      .metric__bar-fill {
        height: 100%;
        border-radius: inherit;
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p class="note">Generated from ${notePath}</p>
    <h2>Totals</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Coverage</th>
          <th>Covered / Total</th>
        </tr>
      </thead>
      <tbody>
        ${totalsTableRows}
      </tbody>
    </table>
    <h2>Files</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Statements</th>
          <th>Branches</th>
          <th>Functions</th>
          <th>Lines</th>
        </tr>
      </thead>
      <tbody>
        ${filesTableRows}
      </tbody>
    </table>
  </body>
</html>`;
}

generatePdf().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
