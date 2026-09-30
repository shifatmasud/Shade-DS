/**
 * Helper to configure Google Workspace CLI (`gws`) authentication
 * Location: /framer/test/authHelper.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const CONFIG_DIR = path.join(process.env.HOME || "/root", ".config", "gws");

export function configureDesktopCredentials(clientId: string, clientSecret: string, projectId = "gen-lang-client-0732713233"): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const clientConfig = {
    installed: {
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      project_id: projectId,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      redirect_uris: ["http://localhost"]
    }
  };

  const filePath = path.join(CONFIG_DIR, "client_secret.json");
  fs.writeFileSync(filePath, JSON.stringify(clientConfig, null, 2), { mode: 0o600 });
  console.log(`[OK] Saved Desktop OAuth credentials to ${filePath}`);
}

export function testWorkspaceAccess(): boolean {
  try {
    const res = execSync("gws drive files list --params '{\"pageSize\": 1}'", { encoding: "utf-8" });
    console.log("[SUCCESS] Google Drive access verified:\n", res);
    return true;
  } catch (err: any) {
    console.error("[ERROR] Failed to access Workspace API:", err.message);
    return false;
  }
}
