import puppeteer, { Browser } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_URL = 'https://happier-anything-775440.framer.app';
const VERSION_URL = 'https://happier-anything-775440-eaa03c066.framer.app';
const ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts/framer_inspection');

async function connectToBrowserless(): Promise<Browser> {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error('Missing BROWSERLESS_TOKEN');

  const endpoints = [
    process.env.BROWSERLESS_WS_URL,
    `wss://production-sfo.browserless.io?token=${token}`,
    `wss://chrome.browserless.io?token=${token}`,
  ].filter(Boolean) as string[];

  for (const ep of endpoints) {
    try {
      console.log(`[Browserless] Connecting to ${ep.replace(/token=[^&]+/, 'token=***')}...`);
      return await puppeteer.connect({ browserWSEndpoint: ep });
    } catch (e: any) {
      console.warn(`[Browserless] Connection failed: ${e.message}`);
    }
  }
  throw new Error('All Browserless endpoints failed');
}

function uploadToUguu(filePath: string): string | null {
  try {
    const res = execSync(`curl -s -m 15 -F "files[]=@${filePath}" https://uguu.se/upload`, {
      encoding: 'utf8',
    });
    const parsed = JSON.parse(res);
    return parsed?.files?.[0]?.url || null;
  } catch (e: any) {
    console.warn(`[Upload Warning] ${e.message}`);
    return null;
  }
}

async function inspectPage() {
  console.log('========================================================================');
  console.log('🔍 Comprehensive Framer Page Dev & Screenshot Inspection');
  console.log(`   Target URL: ${TARGET_URL}`);
  console.log('========================================================================\n');

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await connectToBrowserless();

  const consoleLogs: { type: string; text: string }[] = [];
  const networkFailures: { url: string; status: number | string }[] = [];

  try {
    // ------------------------------------------------------------------------
    // Phase 1: Desktop Viewport Inspection (1440x900)
    // ------------------------------------------------------------------------
    console.log('[Dev Inspection] Loading Desktop Viewport (1440x900)...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err: any) => {
      consoleLogs.push({ type: 'pageerror', text: String(err?.message || err) });
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    page.on('requestfailed', (req) => {
      networkFailures.push({ url: req.url(), status: req.failure()?.errorText || 'failed' });
    });

    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log(`[HTTP Status]: ${response?.status()} ${response?.statusText()}`);

    // Wait for animations / 3D shaders to hydrate
    await new Promise((r) => setTimeout(r, 4000));

    // Deep DOM & Canvas Inspection
    const devAudit = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas')).map((c, i) => {
        const rect = c.getBoundingClientRect();
        let pixelSample = 'N/A';
        try {
          const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
          if (gl) {
            const pixels = new Uint8Array(4);
            gl.readPixels(
              Math.floor(c.width / 2),
              Math.floor(c.height / 2),
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels
            );
            pixelSample = `RGBA(${pixels[0]}, ${pixels[1]}, ${pixels[2]}, ${pixels[3]})`;
          }
        } catch (e: any) {
          pixelSample = `Error reading: ${e.message}`;
        }

        return {
          index: i,
          width: c.width,
          height: c.height,
          clientWidth: c.clientWidth,
          clientHeight: c.clientHeight,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          pixelCenter: pixelSample,
          visible: rect.width > 0 && rect.height > 0 && window.getComputedStyle(c).display !== 'none',
        };
      });

      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => ({
        tag: h.tagName,
        text: (h.textContent || '').trim().slice(0, 100),
      }));

      const interactiveCards = Array.from(document.querySelectorAll('[data-framer-name]')).map((el) => ({
        name: el.getAttribute('data-framer-name'),
        tag: el.tagName,
        rect: el.getBoundingClientRect(),
      }));

      const pageTitle = document.title;
      const htmlLang = document.documentElement.lang;

      return {
        title: pageTitle,
        htmlLang,
        canvases,
        headings,
        interactiveCards: interactiveCards.slice(0, 10),
      };
    });

    console.log('\n[DOM Audit Findings]:');
    console.log(`- Page Title: "${devAudit.title}"`);
    console.log(`- Canvases Found: ${devAudit.canvases.length}`);
    devAudit.canvases.forEach((c) => {
      console.log(
        `  Canvas #${c.index}: ${c.width}x${c.height}px (Layout: ${c.clientWidth}x${c.clientHeight}px), Visible: ${c.visible}, Center Pixel: ${c.pixelCenter}`
      );
    });
    console.log(`- Headings (${devAudit.headings.length}):`);
    devAudit.headings.forEach((h) => console.log(`  <${h.tag}>: "${h.text}"`));

    // Capture Desktop Screenshot
    const desktopShotPath = path.join(ARTIFACTS_DIR, 'desktop_1440.png');
    await page.screenshot({ path: desktopShotPath, fullPage: false });
    console.log(`\n[Screenshot] Desktop screenshot captured at: ${desktopShotPath}`);
    const desktopUrl = uploadToUguu(desktopShotPath);
    console.log(`[Hosted Desktop Screenshot]: ${desktopUrl || 'Saved locally'}`);

    // ------------------------------------------------------------------------
    // Phase 2: Mobile Viewport Inspection (390x844)
    // ------------------------------------------------------------------------
    console.log('\n[Dev Inspection] Loading Mobile Viewport (390x844 iPhone 14)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
    await mobilePage.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));

    const mobileShotPath = path.join(ARTIFACTS_DIR, 'mobile_390.png');
    await mobilePage.screenshot({ path: mobileShotPath, fullPage: false });
    console.log(`[Screenshot] Mobile screenshot captured at: ${mobileShotPath}`);
    const mobileUrl = uploadToUguu(mobileShotPath);
    console.log(`[Hosted Mobile Screenshot]: ${mobileUrl || 'Saved locally'}`);

    // ------------------------------------------------------------------------
    // Phase 3: Console & Network Summary
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('📊 Dev Diagnostics Summary:');
    console.log('========================================================================');

    const errorLogs = consoleLogs.filter((l) => l.type === 'error' || l.type === 'pageerror');
    const warnLogs = consoleLogs.filter((l) => l.type === 'warn');

    console.log(`Console Logs Total: ${consoleLogs.length}`);
    console.log(`Console Errors: ${errorLogs.length}`);
    errorLogs.forEach((e) => console.log(`  ❌ [Error]: ${e.text}`));

    console.log(`Console Warnings: ${warnLogs.length}`);
    warnLogs.forEach((w) => console.log(`  ⚠️  [Warn]: ${w.text}`));

    console.log(`Network Failures: ${networkFailures.length}`);
    networkFailures.forEach((n) => console.log(`  🚫 [Net Failed]: ${n.status} -> ${n.url}`));

    console.log('\n🖼️  Visual Previews:');
    console.log(`- Desktop (1440px): ${desktopUrl}`);
    console.log(`- Mobile (390px):  ${mobileUrl}`);

    await page.close();
    await mobilePage.close();
  } finally {
    await browser.close();
  }
}

inspectPage().catch((e) => {
  console.error('[Inspection Error]', e);
  process.exit(1);
});
