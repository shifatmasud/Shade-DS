import puppeteer from 'puppeteer-core';

async function takeScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;
  const url = 'https://framer.com';
  
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

    await page.setViewport({ width: 1280, height: 720 });

    console.log('Navigating to framer.com...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting 5 seconds for stability...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'preview_screenshot.png' });

    console.log('Screenshot saved as preview_screenshot.png');

    await browser.close();
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    process.exit(1);
  }
}

takeScreenshot();
