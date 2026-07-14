import { scanDocuments } from "../scanner/scanner.js";
import { validateDocuments } from "../validator/validator.js";
import { logReport } from "../utils/display.js";

export async function runValidate(_args: string[]): Promise<void> {
  console.log("[DGPS] Scanning docs/...");
  const sources = scanDocuments();
  console.log(`[DGPS] Validating ${sources.length} documents...`);
  const report = validateDocuments(sources);
  logReport(report.issues);
  if (report.passed) {
    console.log(`\n✅ Validation PASSED (${report.valid_files}/${report.total_files} valid)`);
  } else {
    console.log(`\n❌ Validation FAILED (${report.valid_files}/${report.total_files} valid)`);
    process.exit(1);
  }
}
