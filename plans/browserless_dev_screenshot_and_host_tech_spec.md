# Tech Spec 

1. **Objective**
   - **Problem Statement**: We need to test taking a full/viewport screenshot of the currently running development application URL (`https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app` or `http://localhost:3000`) using the Browserless cloud service and upload the resulting image to a free temporary hosting server to provide an accessible public Web URL.
   - **Solution Overview**: Execute a Node/Puppeteer script utilizing the pre-configured `BROWSERLESS_TOKEN` connecting via Browserless WebSocket endpoint (`wss://production-sfo.browserless.io` or `wss://chrome.browserless.io`), navigate to the development app URL, wait for full network idle and React hydration, capture the screenshot, save it locally, and upload it to a public temporary file host (e.g., `0x0.st`, `tmpfiles.org`, `litterbox.catbox.moe`) to retrieve a direct web URL.
   - **Scope**: Automated script execution, validation, upload, and reporting web URL.
   - **Context**: Verifying browserless screenshot infrastructure against live dev environment in AI Studio.

2. **Success Criteria**
   - **Key Results**:
     - Browserless successfully connects and renders the dev app URL.
     - A valid PNG screenshot of the application is captured and saved.
     - The screenshot is uploaded to a temporary hosting service.
     - Direct Web URL is returned to the user for viewing.
   - **Non-Negotiables & Criteria**:
     - Do not expose secret tokens in plain console output or files.
     - Handle page timeouts gracefully (e.g. wait for DOM content / network idle).
     - Provide fallback upload services if one host fails.

3. **Project Requirements**
   - [x] Check environment token availability.
   - [ ] Build/update `/scripts/screenshot.ts` (or dedicated runner) to target the current dev URL with appropriate viewport and wait conditions.
   - [ ] Run the browserless capture script.
   - [ ] Upload the captured screenshot to temporary hosting provider(s).
   - [ ] Verify image URL availability and provide the direct link.

4. **Architecture Decisions**
   - **Puppeteer-Core with Browserless WS**: Connect via WebSocket to Browserless cloud browser (`wss://production-sfo.browserless.io?token=...` / `wss://chrome.browserless.io?token=...`).
   - **Dev URL Target**: Target `https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app` so cloud browserless instance can access the publicly reachable development URL.
   - **Hosting Provider Redundancy**: Multi-target upload script (trying `tmpfiles.org`, `0x0.st`, `litterbox.catbox.moe`) ensuring high availability.

5. **Pseudo Code**
   ```shade
   DATA {
     devUrl: String = "https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app",
     token: Env("BROWSERLESS_TOKEN"),
     outputFile: Path = "dev_screenshot.png"
   }
   LOGIC {
     browser = Puppeteer.connect(endpoint: "wss://production-sfo.browserless.io?token=" + token)
     page = browser.newPage()
     page.setViewport(1440, 900)
     page.goto(devUrl, waitUntil: "networkidle2")
     page.screenshot(path: outputFile)
     browser.close()
     url = UploadToTempHost(outputFile)
   }
   RENDER {
     Return(url)
   }
   ```
