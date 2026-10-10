import puppeteer, { Browser, Page } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Configuration options for screenshot capture & hosting
 */
export interface ScreenshotOptions {
  /** Target URL to render and capture */
  targetUrl?: string;
  /** Output image file path (default: dev_screenshot.png) */
  outputPath?: string;
  /** Capture entire scrollable page height instead of viewport */
  fullPage?: boolean;
  /** CSS Selector to clip and capture a specific component / element */
  selector?: string;
  /** Viewport width in px (default: 1440) */
  viewportWidth?: number;
  /** Viewport height in px (default: 900) */
  viewportHeight?: number;
  /** Device scale factor / DPR for retina rendering (default: 2) */
  deviceScaleFactor?: number;
  /** Settle delay in ms for animations and 3D scenes to stabilize (default: 2500) */
  settleDelayMs?: number;
  /** Page navigation timeout in ms (default: 45000) */
  timeoutMs?: number;
  /** Color scheme preference ('dark' | 'light' | 'no-preference') */
  colorScheme?: 'dark' | 'light' | 'no-preference';
  /** Skip uploading to temporary hosting services */
  skipUpload?: boolean;
}

/**
 * Result structure returned by takeAndHostScreenshot
 */
export interface ScreenshotResult {
  success: boolean;
  targetUrl: string;
  localPath: string;
  fileSizeBytes: number;
  dimensions: { width: number; height: number; dpr: number };
  directUrl?: string;
  mirrors: { service: string; url: string; direct?: boolean }[];
  capturedAt: string;
  elapsedMs: number;
}

const DEFAULT_TARGET_URL =
  'https://ais-pre-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app';

/**
 * Connects to Browserless with multi-region endpoint failover
 */
async function connectToBrowserless(token: string): Promise<Browser> {
  const endpoints = [
    process.env.BROWSERLESS_WS_URL,
    `wss://production-sfo.browserless.io?token=${token}`,
    `wss://chrome.browserless.io?token=${token}`,
  ].filter(Boolean) as string[];

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const sanitizedLog = endpoint.replace(/token=[^&]+/, 'token=***');
      console.log(`[Browserless] Connecting to ${sanitizedLog}...`);
      const browser = await puppeteer.connect({
        browserWSEndpoint: endpoint,
      });
      return browser;
    } catch (err) {
      lastError = err;
      console.warn(`[Browserless] Failed endpoint, trying fallback...`);
    }
  }

  throw new Error(`Unable to connect to Browserless endpoints: ${String(lastError)}`);
}

/**
 * Uploads a local image file to free temporary hosting services
 */
function uploadToTemporaryHosts(filePath: string): { service: string; url: string; direct: boolean }[] {
  const uploads: { service: string; url: string; direct: boolean }[] = [];

  if (!fs.existsSync(filePath)) {
    return uploads;
  }

  // 1. Primary: Uguu (instant direct CDN link)
  try {
    const res = execSync(`curl -s -m 12 -F "files[]=@${filePath}" https://uguu.se/upload`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(res);
    if (parsed?.files?.[0]?.url) {
      uploads.push({ service: 'Uguu CDN', url: parsed.files[0].url, direct: true });
    }
  } catch {
    // Continue to fallback hosts
  }

  // 2. Secondary: tmpfiles.org
  try {
    const res = execSync(`curl -s -m 12 -F "file=@${filePath}" https://tmpfiles.org/api/v1/upload`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(res);
    if (parsed?.data?.url) {
      const rawUrl = parsed.data.url;
      const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      uploads.push({ service: 'tmpfiles.org (Viewer)', url: rawUrl, direct: false });
      uploads.push({ service: 'tmpfiles.org (Direct)', url: directUrl, direct: true });
    }
  } catch {
    // Continue to fallback hosts
  }

  // 3. Tertiary: 0x0.st
  try {
    const res = execSync(`curl -s -m 12 -F "file=@${filePath}" https://0x0.st`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (res.startsWith('http')) {
      uploads.push({ service: '0x0.st', url: res, direct: true });
    }
  } catch {
    // Continue to fallback hosts
  }

  // 4. Quaternary: litterbox.catbox.moe (24h retention)
  try {
    const res = execSync(
      `curl -s -m 12 -F "reqtype=fileupload" -F "time=24h" -F "fileToUpload=@${filePath}" https://litterbox.catbox.moe/resources/internals/api.php`,
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }
    ).trim();
    if (res.startsWith('http')) {
      uploads.push({ service: 'Litterbox (24h)', url: res, direct: true });
    }
  } catch {
    // End of host chain
  }

  return uploads;
}

/**
 * Standalone, full-featured screenshot capture and hosting engine
 */
export async function takeAndHostScreenshot(
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const startTime = Date.now();
  const token = process.env.BROWSERLESS_TOKEN;

  if (!token) {
    throw new Error('BROWSERLESS_TOKEN environment variable is missing.');
  }

  const targetUrl =
    options.targetUrl ||
    process.env.TARGET_URL ||
    process.env.DEV_URL ||
    DEFAULT_TARGET_URL;

  const outputPath = path.resolve(options.outputPath || 'dev_screenshot.png');
  const fullPage = options.fullPage ?? false;
  const viewportWidth = options.viewportWidth ?? 1440;
  const viewportHeight = options.viewportHeight ?? 900;
  const deviceScaleFactor = options.deviceScaleFactor ?? 2;
  const settleDelayMs = options.settleDelayMs ?? 2500;
  const timeoutMs = options.timeoutMs ?? 45000;
  const colorScheme = options.colorScheme ?? 'dark';

  console.log(`\n============================================================`);
  console.log(`📸 BROWSERLESS STANDALONE SCREENSHOT ENGINE`);
  console.log(`============================================================`);
  console.log(`🎯 Target URL    : ${targetUrl}`);
  console.log(`📐 Viewport      : ${viewportWidth}x${viewportHeight} (@${deviceScaleFactor}x DPR)`);
  console.log(`📜 Full Page     : ${fullPage ? 'YES' : 'NO'}`);
  if (options.selector) {
    console.log(`🔍 Clip Selector : ${options.selector}`);
  }
  console.log(`💾 Output Path   : ${outputPath}`);
  console.log(`------------------------------------------------------------`);

  const browser = await connectToBrowserless(token);

  try {
    const page: Page = await browser.newPage();

    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor,
    });

    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: colorScheme },
    ]);

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    console.log(`[Navigation] Loading ${targetUrl}...`);
    try {
      await page.goto(targetUrl, {
        waitUntil: 'networkidle2',
        timeout: timeoutMs,
      });
    } catch {
      console.warn(`[Navigation] Network idle reached timeout limit, proceeding with capture.`);
    }

    if (settleDelayMs > 0) {
      console.log(`[Stabilizer] Waiting ${settleDelayMs}ms for React hydration and 3D canvas...`);
      await new Promise((r) => setTimeout(r, settleDelayMs));
    }

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`[Capture] Snapping high-res screenshot...`);
    if (options.selector) {
      const element = await page.$(options.selector);
      if (!element) {
        throw new Error(`Target selector "${options.selector}" was not found in the DOM.`);
      }
      await element.screenshot({ path: outputPath });
    } else {
      await page.screenshot({ path: outputPath, fullPage });
    }

    const fileSize = fs.statSync(outputPath).size;
    console.log(`[Saved] File saved to ${outputPath} (${(fileSize / 1024).toFixed(1)} KB)`);

    let mirrors: { service: string; url: string; direct?: boolean }[] = [];
    let directUrl: string | undefined;

    if (!options.skipUpload) {
      console.log(`[Hosting] Uploading image to temporary free hosts...`);
      mirrors = uploadToTemporaryHosts(outputPath);
      const direct = mirrors.find((m) => m.direct);
      if (direct) {
        directUrl = direct.url;
      }
    }

    const elapsedMs = Date.now() - startTime;
    const result: ScreenshotResult = {
      success: true,
      targetUrl,
      localPath: outputPath,
      fileSizeBytes: fileSize,
      dimensions: {
        width: viewportWidth,
        height: viewportHeight,
        dpr: deviceScaleFactor,
      },
      directUrl,
      mirrors,
      capturedAt: new Date().toISOString(),
      elapsedMs,
    };

    console.log(`\n============================================================`);
    console.log(`🎉 CAPTURE COMPLETE (${(elapsedMs / 1000).toFixed(2)}s)`);
    console.log(`============================================================`);
    if (directUrl) {
      console.log(`🔗 Direct Image  : ${directUrl}`);
    }
    if (mirrors.length > 0) {
      console.log(`🌐 Available Mirrors:`);
      mirrors.forEach((m) => {
        console.log(`   • [${m.service}]: ${m.url}`);
      });
    }
    console.log(`============================================================\n`);

    return result;
  } finally {
    await browser.close();
  }
}

/**
 * CLI Argument Parser & Runner
 */
function parseCliArgs(): ScreenshotOptions & { jsonOutput?: boolean } {
  const args = process.argv.slice(2);
  const options: ScreenshotOptions & { jsonOutput?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      console.log(`
Browserless Standalone Screenshot CLI

Usage:
  npx tsx plugins/browserless-screenshot/screenshot.ts [Target URL] [options]

Options:
  --url <url>           Target URL to capture (default: shared preview URL)
  --output, -o <path>   Local file output path (default: dev_screenshot.png)
  --full-page, -f       Capture full scrollable page height
  --selector, -s <css>  Capture only a specific CSS element selector
  --width <px>          Viewport width (default: 1440)
  --height <px>         Viewport height (default: 900)
  --dpr <n>             Device Pixel Ratio (default: 2 for Retina)
  --delay <ms>          Settle delay ms (default: 2500)
  --timeout <ms>        Max navigation timeout ms (default: 45000)
  --light / --dark      Color scheme emulation (default: dark)
  --no-upload           Skip uploading to temporary hosting services
  --json                Output result formatted as JSON
  --help, -h            Show this help menu
      `);
      process.exit(0);
    } else if (arg === '--url' && args[i + 1]) {
      options.targetUrl = args[++i];
    } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (arg === '--full-page' || arg === '-f') {
      options.fullPage = true;
    } else if ((arg === '--selector' || arg === '-s') && args[i + 1]) {
      options.selector = args[++i];
    } else if (arg === '--width' && args[i + 1]) {
      options.viewportWidth = parseInt(args[++i], 10);
    } else if (arg === '--height' && args[i + 1]) {
      options.viewportHeight = parseInt(args[++i], 10);
    } else if (arg === '--dpr' && args[i + 1]) {
      options.deviceScaleFactor = parseFloat(args[++i]);
    } else if (arg === '--delay' && args[i + 1]) {
      options.settleDelayMs = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeoutMs = parseInt(args[++i], 10);
    } else if (arg === '--light') {
      options.colorScheme = 'light';
    } else if (arg === '--dark') {
      options.colorScheme = 'dark';
    } else if (arg === '--no-upload') {
      options.skipUpload = true;
    } else if (arg === '--json') {
      options.jsonOutput = true;
    } else if (!arg.startsWith('-') && !options.targetUrl) {
      options.targetUrl = arg;
    }
  }

  return options;
}

// Auto-run when invoked directly via CLI
if (
  process.argv[1]?.endsWith('screenshot.ts') ||
  process.argv[1]?.endsWith('screenshot.js')
) {
  const parsed = parseCliArgs();

  takeAndHostScreenshot(parsed)
    .then((res) => {
      if (parsed.jsonOutput) {
        console.log(JSON.stringify(res, null, 2));
      }
    })
    .catch((err) => {
      console.error('\n❌ Screenshot failed:', err.message || err);
      process.exit(1);
    });
}
