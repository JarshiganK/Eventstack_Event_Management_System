import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import puppeteer from "puppeteer";

async function generatePdf() {
  const coverageHtml = resolve(process.cwd(), "coverage", "index.html");
  if (!existsSync(coverageHtml)) {
    throw new Error(
      `Coverage HTML not found at ${coverageHtml}. Run "npm run test:coverage" first.`,
    );
  }

  const reportsDir = resolve(process.cwd(), "Unit_test", "reports");
  mkdirSync(reportsDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(coverageHtml).href, {
      waitUntil: "networkidle0",
    });
    const outputPath = join(reportsDir, "coverage-report.pdf");
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

generatePdf().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
