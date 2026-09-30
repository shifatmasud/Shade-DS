/**
 * Verification test script for OpenMail CLI installation.
 * Verifies binary presence, PATH resolution, help outputs, and subcommand functionality.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function runTest(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message || String(err) });
    console.error(`[FAIL] ${name}: ${err.message || String(err)}`);
  }
}

console.log('--- Starting OpenMail CLI Verification ---');

// Test 1: System PATH binary resolution
runTest('System PATH resolution', () => {
  const whichOutput = execSync('which openmail', { encoding: 'utf-8' }).trim();
  if (!whichOutput || !fs.existsSync(whichOutput)) {
    throw new Error(`openmail binary not found in PATH: got "${whichOutput}"`);
  }
});

// Test 2: Local ./bin/openmail link verification
runTest('Workspace ./bin/openmail presence', () => {
  const localBin = path.resolve(process.cwd(), 'bin/openmail');
  if (!fs.existsSync(localBin)) {
    throw new Error(`Expected ./bin/openmail to exist at ${localBin}`);
  }
});

// Test 3: Root CLI execution and help output
runTest('CLI help command execution', () => {
  const output = execSync('openmail --help', { encoding: 'utf-8' });
  const requiredSubcommands = ['init', 'inbox', 'pod', 'domain', 'policy', 'send', 'messages', 'threads'];
  for (const cmd of requiredSubcommands) {
    if (!output.includes(cmd)) {
      throw new Error(`Expected help output to list command "${cmd}"`);
    }
  }
});

// Test 4: Subcommand help execution for 'send'
runTest('Subcommand help for "send"', () => {
  const output = execSync('openmail help send', { encoding: 'utf-8' });
  if (!output.includes('--to') || !output.includes('--subject') || !output.includes('--body')) {
    throw new Error('send command options (--to, --subject, --body) missing from help output');
  }
});

// Test 5: Subcommand help execution for 'inbox'
runTest('Subcommand help for "inbox"', () => {
  const output = execSync('openmail help inbox', { encoding: 'utf-8' });
  if (!output.includes('create') || !output.includes('list') || !output.includes('keys')) {
    throw new Error('inbox subcommands missing from help output');
  }
});

// Test 6: Global flags presence
runTest('Global flags inspection', () => {
  const output = execSync('openmail --help', { encoding: 'utf-8' });
  if (!output.includes('--api-key') || !output.includes('--base-url') || !output.includes('--json')) {
    throw new Error('Global flags (--api-key, --base-url, --json) missing from help output');
  }
});

console.log('--- OpenMail CLI Verification Summary ---');
const total = results.length;
const passed = results.filter((r) => r.passed).length;
console.log(`Passed: ${passed}/${total}`);

if (passed !== total) {
  process.exit(1);
} else {
  console.log('All OpenMail CLI verification tests passed successfully.');
}
