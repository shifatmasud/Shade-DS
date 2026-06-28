import puppeteer from 'puppeteer-core';

async function takeScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;
  const url = process.env.APP_URL || 'https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app';
  
  if (!token) {
    console.error('Error: BROWSERLESS_TOKEN environment variable is required.');
    console.log('You can get one at https://www.browserless.io/');
    process.exit(1);
  }

  const browserWSEndpoint = `wss://chrome.browserless.io?token=${token}`;

  console.log(`Connecting to browserless at ${browserWSEndpoint}...`);
  console.log(`Target URL: ${url}`);

  try {
    const browser = await puppeteer.connect({ browserWSEndpoint });
    const page = await browser.newPage();

    // Set viewport to a common desktop size
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'preview_screenshot.png', fullPage: true });

    console.log('Screenshot saved as preview_screenshot.png');

    await browser.close();
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    process.exit(1);
  }
}

takeScreenshot();
