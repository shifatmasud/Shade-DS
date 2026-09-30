/**
 * Script to dispatch the Top 3 Technology Trends Research Report
 * to shifatmasud@gmail.com via OpenMail CLI.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function getEnvApiKey(): string | undefined {
  if (process.env.OPENMAIL_API_KEY) {
    return process.env.OPENMAIL_API_KEY;
  }
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
  return undefined;
}

async function sendReport() {
  console.log('--- Preparing Technology Trends Research Report ---');

  const apiKey = getEnvApiKey();
  if (!apiKey) {
    console.error('Missing OPENMAIL_API_KEY');
    process.exit(1);
  }
  process.env.OPENMAIL_API_KEY = apiKey;

  const recipient = 'shifatmasud@gmail.com';
  const subject = 'Research Report: Top 3 Technology Trends Shaping 2026';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb; margin: 0; padding: 24px; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0; }
    .subtitle { font-size: 14px; color: #6b7280; margin: 0; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; }
    .trend-card { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 18px 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
    .trend-title { font-size: 18px; font-weight: 700; color: #1e3a8a; margin: 0 0 8px 0; }
    .trend-theme { font-size: 13px; font-weight: 600; text-transform: uppercase; color: #2563eb; letter-spacing: 0.5px; margin-bottom: 8px; }
    .trend-body { font-size: 14px; color: #334155; margin: 0 0 10px 0; }
    ul { margin: 8px 0 0 0; padding-left: 20px; }
    li { font-size: 13px; color: #475569; margin-bottom: 4px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">OpenMail AI Agent Briefing</div>
      <h1 class="title">Top 3 Technology Trends Shaping 2026</h1>
      <p class="subtitle">Synthesized from live discussions on X (Twitter), McKinsey & Company, Gartner, and industry research.</p>
    </div>

    <p style="font-size: 15px; color: #374151; margin-bottom: 24px;">
      Hello Shifat,<br><br>
      Here is your automated research briefing covering the three most transformative technology paradigms dominating technology discourse, venture capital investment, and enterprise engineering in 2026:
    </p>

    <!-- Trend 1 -->
    <div class="trend-card">
      <div class="trend-theme">Trend 1 &bull; Machine Autonomy</div>
      <h2 class="trend-title">1. Agentic AI & Autonomous Multi-Agent Swarms</h2>
      <p class="trend-body">
        The paradigm has definitively transitioned from single conversational LLMs to goal-driven autonomous multi-agent systems. Rather than simply responding to human prompts, agentic swarms operate in coordinated pipelines (planning, code generation, execution, automated verification, and self-healing).
      </p>
      <ul>
        <li><strong>Tool Use & Ambient Execution:</strong> Agents autonomously navigate CLIs, APIs, browser engines (Firecrawl/Browserless), and email gateways (OpenMail).</li>
        <li><strong>Role-Based Swarms:</strong> Separation of concerns into Planner, Lead Coordinator, Domain Workers, and Authoritative Reviewers with topological task dependencies.</li>
        <li><strong>Enterprise Reality:</strong> McKinsey highlights "machine autonomy" as a foundational growth engine replacing brittle robotic process automation (RPA).</li>
      </ul>
    </div>

    <!-- Trend 2 -->
    <div class="trend-card" style="border-left-color: #10b981;">
      <div class="trend-theme" style="color: #059669;">Trend 2 &bull; Physical Intelligence</div>
      <h2 class="trend-title" style="color: #064e3b;">2. Physical AI & Neuromorphic Edge Computing</h2>
      <p class="trend-body">
        AI is moving off server racks and into the physical environment. Known as Physical or Embodied AI, polyfunctional humanoid robots, autonomous inspection drones, and spatial intelligence models are deploying into industrial facilities, logistics hubs, and hazardous inspection environments.
      </p>
      <ul>
        <li><strong>Sub-Watt Brain-Inspired Silicon:</strong> Commercialization of neuromorphic processors enables real-time edge sensory inference with 90% less energy than GPUs.</li>
        <li><strong>Spatial World Models:</strong> Multimodal diffusion and video transformer models allowing robots to reason over 3D physics, object persistence, and tactile feedback.</li>
        <li><strong>Industrial Adoption:</strong> Gartner marks Physical AI as a critical trend in government and infrastructure modernization.</li>
      </ul>
    </div>

    <!-- Trend 3 -->
    <div class="trend-card" style="border-left-color: #8b5cf6;">
      <div class="trend-theme" style="color: #7c3aed;">Trend 3 &bull; Frontier Infrastructure</div>
      <h2 class="trend-title" style="color: #4c1d95;">3. Practical Quantum Simulation & Post-Quantum Cryptography</h2>
      <p class="trend-body">
        Quantum computing is reaching practical utility in targeted scientific domains (catalyst discovery, molecular modeling, complex financial optimization), while simultaneously driving an urgent global transition to quantum-resilient cybersecurity.
      </p>
      <ul>
        <li><strong>Hybrid Classical-Quantum Solvers:</strong> Cloud quantum QPUs combined with high-bandwidth AI superclusters for accelerated material science.</li>
        <li><strong>Mandatory PQC Migration:</strong> Enterprise deployment of NIST-standardized Post-Quantum Cryptography algorithms (ML-KEM, ML-DSA) to protect against "harvest now, decrypt later" threats.</li>
        <li><strong>Compressed Cyber Defense:</strong> Real-time automated defensive algorithms shielding systems against quantum-speed reconnaissance and zero-day generation.</li>
      </ul>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 14px 16px; margin-top: 24px;">
      <strong style="font-size: 13px; color: #1f2937;">Operational Intelligence Note:</strong>
      <p style="font-size: 12px; color: #4b5563; margin: 4px 0 0 0;">
        Live market signals and analyst posts on X (Twitter) were gathered via Firecrawl search integration (tracking active threads from @McKinsey, @Gartner_inc, and developer communities). Direct interactive browser login to X.com was bypassed in favor of public intelligence indexing to prevent anti-bot CAPTCHA lockouts.
      </p>
    </div>

    <div class="footer">
      Dispatched via OpenMail CLI &bull; Sender: shifatmasud@omail.sh &bull; Timestamp: ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>
  `.trim();

  // Write temporary file for body to ensure clean multiline handling
  const tmpFile = path.resolve('/tmp/email_body.html');
  fs.writeFileSync(tmpFile, htmlBody, 'utf-8');

  console.log(`Sending email to ${recipient}...`);
  try {
    const rawOutput = execSync(
      `openmail send --to "${recipient}" --subject "${subject}" --body "$(cat /tmp/email_body.html)" --json`,
      {
        encoding: 'utf-8',
        env: process.env,
      }
    );
    const parsed = JSON.parse(rawOutput);
    console.log('[SUCCESS] Email sent successfully!');
    console.log(`          Message ID: ${parsed.id || parsed.messageId || 'sent'}`);
    console.log(`          Thread ID:  ${parsed.threadId || 'active'}`);
  } catch (err: any) {
    console.error(`[FAIL] Send command failed: ${err.message}`);
    process.exit(1);
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  }
}

sendReport().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
