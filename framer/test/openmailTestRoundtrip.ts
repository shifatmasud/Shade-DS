/**
 * OpenMail Roundtrip Verification Script
 * Sends a test email to the agent inbox (shifatmasud@omail.sh) and reads it back
 * to verify complete bidirectional delivery and API authentication.
 */

import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function getEnvApiKey(): string | undefined {
  if (process.env.OPENMAIL_API_KEY) {
    return process.env.OPENMAIL_API_KEY;
  }
  // Try reading from .env
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('OPENMAIL_API_KEY=')) {
        return trimmed.replace(/^OPENMAIL_API_KEY=/, '').replace(/['"]/g, '');
      }
    }
  }
  // Try reading from ~/.openmail-cli/state.json
  const statePath = path.resolve(process.env.HOME || '/root', '.openmail-cli', 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      if (state.savedApiKey) return state.savedApiKey;
    } catch {}
  }
  return undefined;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRoundtrip() {
  console.log('=== OpenMail Roundtrip Verification ===\n');

  const apiKey = getEnvApiKey();
  if (!apiKey) {
    console.error('Error: OPENMAIL_API_KEY is not defined in environment, .env, or state.json.');
    process.exit(1);
  }
  console.log(`[OK] OpenMail API Key detected (${apiKey.slice(0, 7)}...${apiKey.slice(-4)})`);

  // Ensure OPENMAIL_API_KEY is available in process.env for child processes
  process.env.OPENMAIL_API_KEY = apiKey;

  const targetInbox = 'shifatmasud@omail.sh';
  const testId = crypto.randomUUID().slice(0, 8);
  const subject = `Agent Verification Test [${testId}]`;
  const body = `Automated verification ping sent at ${new Date().toISOString()}.\nVerification Token: ${testId}`;

  console.log(`\n1. Sending test email to ${targetInbox}...`);
  console.log(`   Subject: "${subject}"`);

  let sendResult: any;
  try {
    const rawSend = execSync(
      `openmail send --to "${targetInbox}" --subject "${subject}" --body "${body}" --json`,
      {
        encoding: 'utf-8',
        env: process.env,
      }
    );
    sendResult = JSON.parse(rawSend);
    console.log('[PASS] Email dispatched successfully:');
    console.log(`       Message ID: ${sendResult.id || sendResult.messageId || 'sent'}`);
    console.log(`       Thread ID:  ${sendResult.threadId || 'active'}`);
  } catch (err: any) {
    console.error(`[FAIL] Failed to send email: ${err.message || String(err)}`);
    process.exit(1);
  }

  console.log('\n2. Polling inbox for delivered test message...');
  const maxAttempts = 15;
  const pollIntervalMs = 2500;
  let receivedMessage: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    process.stdout.write(`   Polling attempt ${attempt}/${maxAttempts}... `);
    try {
      const rawList = execSync('openmail messages list --limit 10 --json', {
        encoding: 'utf-8',
        env: process.env,
      });
      const parsed = JSON.parse(rawList);
      const messages = parsed.data || (Array.isArray(parsed) ? parsed : []);

      const found = messages.find((m: any) => m.subject && m.subject.includes(testId));
      if (found) {
        console.log('FOUND!');
        receivedMessage = found;
        break;
      } else {
        console.log('pending');
      }
    } catch (err: any) {
      console.log(`query error: ${err.message}`);
    }

    if (attempt < maxAttempts) {
      await sleep(pollIntervalMs);
    }
  }

  if (!receivedMessage) {
    // If not found in messages, check unread threads as fallback
    console.log('\n   Checking unread threads...');
    try {
      const rawThreads = execSync('openmail threads list --is-read false --json', {
        encoding: 'utf-8',
        env: process.env,
      });
      const parsedThreads = JSON.parse(rawThreads);
      const threads = parsedThreads.data || (Array.isArray(parsedThreads) ? parsedThreads : []);
      const foundThread = threads.find((t: any) => t.subject && t.subject.includes(testId));
      if (foundThread) {
        console.log(`   Found thread ${foundThread.id}! Fetching messages...`);
        const rawThreadMsgs = execSync(`openmail threads get --thread-id "${foundThread.id}" --json`, {
          encoding: 'utf-8',
          env: process.env,
        });
        const threadDetails = JSON.parse(rawThreadMsgs);
        receivedMessage = threadDetails.messages?.[0] || threadDetails;
      }
    } catch (err: any) {
      console.log(`   Thread query error: ${err.message}`);
    }
  }

  if (!receivedMessage) {
    console.error('\n[FAIL] Test message was not received within the timeout window.');
    process.exit(1);
  }

  console.log('\n3. Validating received message content:');
  console.log(`   From:        ${receivedMessage.fromAddr || receivedMessage.from}`);
  console.log(`   Subject:     ${receivedMessage.subject}`);
  console.log(`   Body (head): ${JSON.stringify(receivedMessage.bodyText?.slice(0, 100) || '')}`);

  if (!receivedMessage.bodyText?.includes(testId) && !receivedMessage.subject?.includes(testId)) {
    console.error(`[FAIL] Received message does not contain token ${testId}`);
    process.exit(1);
  }

  console.log('\n[SUCCESS] Roundtrip verification completed successfully!');
  console.log('          Email dispatch and readback verified for shifatmasud@omail.sh.');
}

runRoundtrip().catch((err) => {
  console.error('Fatal error during roundtrip execution:', err);
  process.exit(1);
});
