import puppeteer from 'puppeteer-core';

async function takeScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;
  const url = 'https://ais-pre-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app';
  
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

    // Set viewport to a common desktop size
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for 5 seconds to ensure animations and dynamic content are loaded
    console.log('Waiting 5 seconds for page stability...');
    await new Promise(resolve => setTimeout(resolve, 5000));

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
