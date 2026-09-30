/**
 * Verification test for Google Workspace CLI (`gws`)
 * Location: /framer/test/gwsVerification.ts
 */

import { execSync } from "child_process";

export interface GwsTestResult {
  step: string;
  success: boolean;
  output: string;
}

export function runGwsDiagnostics(): GwsTestResult[] {
  const results: GwsTestResult[] = [];

  // Step 1: Verify version
  try {
    const versionOutput = execSync("gws --version", { encoding: "utf-8" }).trim();
    results.push({
      step: "Version Check",
      success: versionOutput.includes("gws 0.22.5"),
      output: versionOutput,
    });
  } catch (err: any) {
    results.push({
      step: "Version Check",
      success: false,
      output: err.message,
    });
  }

  // Step 2: Verify binary at ./bin/gws
  try {
    const binOutput = execSync("./bin/gws --version", { encoding: "utf-8" }).trim();
    results.push({
      step: "Workspace ./bin/gws Check",
      success: binOutput.includes("gws 0.22.5"),
      output: binOutput,
    });
  } catch (err: any) {
    results.push({
      step: "Workspace ./bin/gws Check",
      success: false,
      output: err.message,
    });
  }

  // Step 3: Verify schema query from Google Discovery service
  try {
    const schemaOutput = execSync("gws schema drive.files.list", { encoding: "utf-8" });
    const parsed = JSON.parse(schemaOutput);
    results.push({
      step: "Discovery Service Schema Fetch (drive.files.list)",
      success: Boolean(parsed && parsed.httpMethod === "GET"),
      output: `Successfully loaded schema for ${parsed.httpMethod} drive.files.list`,
    });
  } catch (err: any) {
    results.push({
      step: "Discovery Service Schema Fetch",
      success: false,
      output: err.message,
    });
  }

  // Step 4: Verify auth status reporting
  try {
    const authStatus = execSync("gws auth status", { encoding: "utf-8" });
    const parsed = JSON.parse(authStatus);
    results.push({
      step: "Auth Status Inspection",
      success: parsed && typeof parsed.auth_method === "string",
      output: `Current auth_method: ${parsed.auth_method}, storage: ${parsed.storage}`,
    });
  } catch (err: any) {
    results.push({
      step: "Auth Status Inspection",
      success: false,
      output: err.message,
    });
  }

  return results;
}

// When executed directly with tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostics = runGwsDiagnostics();
  console.log("=== Google Workspace CLI Diagnostics ===");
  diagnostics.forEach((d) => {
    console.log(`[${d.success ? "PASS" : "FAIL"}] ${d.step}: ${d.output}`);
  });
}
