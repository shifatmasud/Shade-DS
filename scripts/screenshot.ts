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

    // Log console messages from the browser
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.error(`BROWSER ERROR: ${error.message}`);
    });

    // Set viewport to a common desktop size
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    const title = await page.title();
    console.log(`Page Title: ${title}`);

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
    console.log(`Page Snippet: ${bodyText.replace(/\n/g, ' ')}`);

    // Handle splash screens or "Open App" buttons if present
    const buttonText = 'Do Magic';
    const button = await page.evaluateHandle((text) => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(b => b.textContent?.includes(text)) || null;
    }, buttonText);

    if (button.asElement()) {
      console.log(`Found "${buttonText}" button, clicking...`);
      await (button.asElement() as any).click();
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => console.log('Navigation wait timed out after click, proceeding...'));
    }

    // Wait for 10 seconds to ensure animations, shaders, and dynamic content are loaded
    console.log('Waiting 10 seconds for page stability...');
    await new Promise(resolve => setTimeout(resolve, 10000));

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
