import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'framer.config.json');

export interface FramerConfig {
  projectId: string;
  projectUrl: string;
  apiKey: string;
  projectName: string;
  siteId: string;
  publishedUrl: string;
  settingsUrl: string;
  domainsSettingsUrl: string;
  codeFiles?: Record<string, string>;
}

export function loadFramerConfig(): FramerConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Framer configuration file not found at ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

async function main() {
  const config = loadFramerConfig();
  console.log('========================================================================');
  console.log(`🚀 Framer Project CLI Helper [${config.projectName}]`);
  console.log(`   Project ID: ${config.projectId}`);
  console.log(`   Project URL: ${config.projectUrl}`);
  console.log(`   Published: ${config.publishedUrl}`);
  console.log('========================================================================');

  const args = process.argv.slice(2);
  const action = args[0] || 'status';

  if (action === 'auth') {
    console.log('[Auth] Authenticating project credentials...');
    execSync(`npx -y @framer/agent@0.0.33 project auth ${config.projectId} ${config.apiKey}`, {
      stdio: 'inherit',
    });
    console.log('[Auth] Success!');
  } else if (action === 'status') {
    console.log('[Status] Checking saved projects...');
    const out = execSync('npx -y @framer/agent@0.0.33 project list', { encoding: 'utf8' });
    console.log(out);
  } else if (action === 'sync') {
    console.log('[Sync] Synchronizing code components to Framer project...');
    const runnerCode = `
      const fs = require('fs');
      const code = fs.readFileSync('framer/LusionCursorTrailFramer.tsx', 'utf8');
      const files = await framer.getCodeFiles();
      const existing = files.find(f => f.name === 'LusionCursorTrail.tsx');
      if (existing) {
        await existing.setFileContent(code);
        console.log('Updated existing LusionCursorTrail.tsx in Framer canvas!');
      } else {
        const file = await framer.createCodeFile('LusionCursorTrail.tsx', code);
        console.log('Created LusionCursorTrail.tsx in Framer canvas with ID:', file.id);
      }
    `;
    execSync(`npx -y @framer/agent@0.0.33 exec -s 1 -e "${runnerCode.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    });
  } else {
    console.log(`Usage: npx tsx plugins/framer-agent-cli/framer_cli.ts [auth | status | sync]`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
