import puppeteer, { Browser } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.resolve(process.cwd(), 'artifacts/lusion_shaders');
const SHADERS_RAW_DIR = path.join(OUTPUT_DIR, 'raw_shaders');
const PROGRAMS_DIR = path.join(OUTPUT_DIR, 'programs');

interface CapturedShader {
  index: number;
  context: string;
  type: 'VERTEX_SHADER' | 'FRAGMENT_SHADER';
  source: string;
  length: number;
  preview: string;
  hasPointer: boolean;
  hasNoise: boolean;
  hasFluid: boolean;
  hasPhysics: boolean;
  hasPost: boolean;
  category: string;
}

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
  throw new Error('Failed to connect to Browserless');
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 Agent 1: Reverse-Engineering & Shader Interception on Lusion.co');
  console.log('========================================================================');

  fs.mkdirSync(SHADERS_RAW_DIR, { recursive: true });
  fs.mkdirSync(PROGRAMS_DIR, { recursive: true });

  let browser: Browser | null = null;

  try {
    browser = await connectToBrowserless();
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Inject deep WebGL hooks
    await page.evaluateOnNewDocument(() => {
      (window as any).__capturedShaders = [];
      const store = (window as any).__capturedShaders;

      function hook(proto: any, contextName: string) {
        if (!proto) return;
        const origCreate = proto.createShader;
        const origSource = proto.shaderSource;

        proto.createShader = function (type: number) {
          const s = origCreate.call(this, type);
          if (s) {
            s.__type = type === 0x8B31 ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER';
          }
          return s;
        };

        proto.shaderSource = function (s: any, src: string) {
          store.push({
            context: contextName,
            type: s ? s.__type || 'UNKNOWN' : 'UNKNOWN',
            source: src,
            length: src ? src.length : 0,
            preview: src ? src.slice(0, 160) : '',
          });
          return origSource.call(this, s, src);
        };
      }

      hook((window as any).WebGLRenderingContext?.prototype, 'WebGL1');
      hook((window as any).WebGL2RenderingContext?.prototype, 'WebGL2');
    });

    console.log('[Navigation] Navigating to https://lusion.co/ ...');
    await page.goto('https://lusion.co/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Navigation] DOMContentLoaded reached.');

    // Wait 4s for initial Three.js scene & shaders to compile
    console.log('[Wait] Waiting 4s for Three.js shaders to compile...');
    await new Promise((r) => setTimeout(r, 4000));

    // Dynamic mouse motion across canvas to stimulate cursor trail shaders
    console.log('[Cursor Motion] Simulating fluid cursor movement across canvas...');
    const cx = 720;
    const cy = 450;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * (140 + i * 4));
      const y = Math.round(cy + Math.sin(a) * (90 + i * 2));
      await page.mouse.move(x, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    await page.mouse.move(100, 450);
    await page.mouse.move(1340, 450, { steps: 6 });
    await new Promise((r) => setTimeout(r, 500));

    // Take high-res screenshot
    console.log('[Screenshot] Capturing screenshot of Lusion.co...');
    const screenshotPath = path.join(OUTPUT_DIR, 'lusion_cursor_trail_capture.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`[Screenshot] Saved to ${screenshotPath}`);

    // Retrieve all captured shaders
    console.log('[Harvest] Extracting all intercepted shader sources...');
    const rawList: any[] = await page.evaluate(() => (window as any).__capturedShaders || []);
    console.log(`[Harvest] Successfully retrieved ${rawList.length} compiled shaders!`);

    // Process, deduplicate and categorize shaders
    const processed: CapturedShader[] = [];
    const seenHashes = new Set<string>();

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const src = item.source || '';
      // Create quick hash to deduplicate exact shader source strings
      const hash = `${item.type}_${item.length}_${src.slice(0, 100)}_${src.slice(-100)}`;
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);

      const lower = src.toLowerCase();
      const hasPointer =
        lower.includes('pointer') ||
        lower.includes('mouse') ||
        lower.includes('cursor') ||
        lower.includes('trail') ||
        lower.includes('touch') ||
        lower.includes('drag');

      const hasNoise =
        lower.includes('noise') ||
        lower.includes('simplex') ||
        lower.includes('perlin') ||
        lower.includes('curl') ||
        lower.includes('snoise') ||
        lower.includes('bluenoise');

      const hasFluid =
        lower.includes('fluid') ||
        lower.includes('velocity') ||
        lower.includes('advect') ||
        lower.includes('pressure') ||
        lower.includes('divergence') ||
        lower.includes('viscosity');

      const hasPhysics =
        lower.includes('spring') ||
        lower.includes('ribbon') ||
        lower.includes('particle') ||
        lower.includes('strand') ||
        lower.includes('verlet') ||
        lower.includes('instance') ||
        lower.includes('transformfeedback') ||
        lower.includes('crossaoshadow');

      const hasPost =
        lower.includes('bloom') ||
        lower.includes('tonemap') ||
        lower.includes('chromatic') ||
        lower.includes('lut') ||
        lower.includes('dither') ||
        lower.includes('composite') ||
        lower.includes('blur');

      let category = 'Scene / Standard 3D Mesh';
      if ((hasPointer || hasFluid) && (hasNoise || hasPhysics)) {
        category = 'Cursor Move Trail / Fluid Advection Simulation';
      } else if (hasPointer) {
        category = 'Pointer Interactive Shading';
      } else if (hasFluid || hasNoise) {
        category = 'GPGPU Noise & Procedural Flow';
      } else if (hasPhysics) {
        category = 'Physics / Geometry Deformation / Shadow AO';
      } else if (hasPost) {
        category = 'Post-Processing Compositor';
      }

      processed.push({
        index: processed.length + 1,
        context: item.context,
        type: item.type,
        source: src,
        length: item.length,
        preview: item.preview,
        hasPointer,
        hasNoise,
        hasFluid,
        hasPhysics,
        hasPost,
        category,
      });
    }

    console.log(`[Deduplicate] Found ${processed.length} unique shader programs out of ${rawList.length} compilations.`);

    // Write all individual shader files
    for (const sh of processed) {
      const ext = sh.type === 'VERTEX_SHADER' ? 'vert' : 'frag';
      const catSlug = sh.category.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const filename = `shader_${String(sh.index).padStart(2, '0')}_${catSlug}.${ext}`;
      fs.writeFileSync(path.join(SHADERS_RAW_DIR, filename), sh.source, 'utf8');
    }

    // Save manifest JSON
    const manifest = {
      timestamp: new Date().toISOString(),
      targetUrl: 'https://lusion.co/',
      totalCompilations: rawList.length,
      uniqueShadersCount: processed.length,
      categoryBreakdown: processed.reduce((acc: any, cur) => {
        acc[cur.category] = (acc[cur.category] || 0) + 1;
        return acc;
      }, {}),
      shaders: processed.map((s) => ({
        index: s.index,
        context: s.context,
        type: s.type,
        length: s.length,
        category: s.category,
        flags: {
          hasPointer: s.hasPointer,
          hasNoise: s.hasNoise,
          hasFluid: s.hasFluid,
          hasPhysics: s.hasPhysics,
          hasPost: s.hasPost,
        },
        preview: s.preview.replace(/\s+/g, ' ').slice(0, 100),
      })),
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'lusion_shaders_manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
    console.log(`[Manifest] Saved manifest to ${path.join(OUTPUT_DIR, 'lusion_shaders_manifest.json')}`);

    // Upload screenshot to multiple mirrors
    let hostedUrl: string | null = null;
    try {
      const res = execSync(`curl -s -m 12 -F "files[]=@${screenshotPath}" https://uguu.se/upload`, {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(res);
      if (parsed?.files?.[0]?.url) {
        hostedUrl = parsed.files[0].url;
        console.log(`[Upload] Screenshot hosted at: ${hostedUrl}`);
      }
    } catch {
      // try fallback
      try {
        const res2 = execSync(`curl -s -m 12 -F "file=@${screenshotPath}" https://0x0.st`, {
          encoding: 'utf8',
        }).trim();
        if (res2.startsWith('http')) {
          hostedUrl = res2;
          console.log(`[Upload] Screenshot hosted at 0x0.st: ${hostedUrl}`);
        }
      } catch {
        // ignore
      }
    }

    console.log('========================================================================');
    console.log('✅ Extraction Phase Completed Successfully!');
    console.log(`   - Raw compilations: ${rawList.length}`);
    console.log(`   - Unique shaders: ${processed.length}`);
    console.log(`   - Trail & Physics shaders: ${processed.filter((s) => s.category.includes('Trail') || s.category.includes('Physics') || s.hasNoise).length}`);
    if (hostedUrl) console.log(`   - Live capture URL: ${hostedUrl}`);
    console.log('========================================================================');
  } finally {
    if (browser) await browser.close();
  }
}

run().catch((e) => {
  console.error('[Fatal Error]', e);
  process.exit(1);
});
