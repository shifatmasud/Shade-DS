import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function takeScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;
  const url = 'https://google.com';
  
  if (!token) {
    console.error('Error: BROWSERLESS_TOKEN environment variable is required.');
    process.exit(1);
  }

  const browserWSEndpoint = `wss://chrome.browserless.io?token=${token}`;

  console.log(`Connecting to browserless...`);
  console.log(`Target URL: ${url}`);

  try {
    const browser = await puppeteer.connect({ browserWSEndpoint });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Taking screenshot...');
    const buffer = await page.screenshot({ type: 'png' });
    
    fs.writeFileSync('preview_screenshot.png', buffer);

    console.log(`Screenshot saved. Size: ${buffer.length} bytes`);
    
    // Quick check: is it all white or all black?
    // This is hard to do without a library, but we can check if there's variation in the buffer.
    const sample = buffer.slice(buffer.length / 2, buffer.length / 2 + 100);
    console.log('Buffer sample (hex):', sample.toString('hex').slice(0, 50));

    await browser.close();
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    process.exit(1);
  }
}

takeScreenshot();
