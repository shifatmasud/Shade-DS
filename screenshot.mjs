import puppeteer from "puppeteer-core";
import fs from "fs";

// Ensure BROWSERLESS_TOKEN is set
if (!process.env.BROWSERLESS_TOKEN) {
  console.error("Error: BROWSERLESS_TOKEN environment variable is not set.");
  process.exit(1);
}

const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
});

try {
  const page = await browser.newPage();

  // Navigate to Framer and wait until the network is idle (page fully loaded)
  await page.goto("https://framer.com", { waitUntil: "networkidle2" });

  // Take a full-page screenshot
  await page.screenshot({ path: "framer-screenshot.png", fullPage: true });

  console.log("Screenshot saved as framer-screenshot.png.");
} finally {
  // Always close to release the session even on error.
  await browser.close();
}
