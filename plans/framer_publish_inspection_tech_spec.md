# Tech Spec 

1. **Objective**
   - **Problem Statement**: The user wants to publish the Framer canvas again, followed by a rigorous dual-layer inspection (screenshot inspection & dev inspection) of the live published Framer website (`https://happier-anything-775440.framer.app`).
   - **Solution Overview**:
     1. Publish the Framer project via `@framer/agent` execution session using `framer.publish()`.
     2. Verify deployment ID, status, and optimization state via `framer.getDeployments()`.
     3. Perform deep dev inspection using Puppeteer in Browserless:
        - Console diagnostics (React hydration mismatch #419/#423, Three.js runtime warnings, syntax/type errors).
        - Network request monitoring (failed CDN resources, blocked cross-origin fonts/textures).
        - DOM & Canvas audit (WebGL2 context initialization, dimensions, visibility, computed bounding boxes).
        - Pixel inspection across critical canvas regions.
     4. Perform visual screenshot inspection:
        - Capture full desktop (1440x900) and mobile (390x844) viewport screenshots.
        - Upload to CDN host for user visual verification.
   - **Scope**: Framer publication trigger, headless Chrome dev console/network/DOM audit, high-resolution visual capture, and diagnostic summary.
   - **Context**: Framer project `R60Z8o2lCHIu3neoIwsu`, site `https://happier-anything-775440.framer.app`.

2. **Success Criteria**
   - **Key Results**:
     - Fresh publication triggered and deployment ID recorded.
     - Live page navigated and dev inspection executed with detailed logging.
     - High-resolution desktop and mobile screenshots captured and hosted.
     - Diagnostic report delivered with actionable findings.
   - **Non-Negotiables**:
     - Strict adherence to `AGENTS.md`. No changes to protected Dock. Clean theme tokens.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/framer_publish_inspection_tech_spec.md`.
   - [ ] Trigger Framer publish via `@framer/agent` CLI session.
   - [ ] Execute `scripts/inspect_framer_page.ts` via Browserless.
   - [ ] Deliver dev inspection findings and hosted screenshot links.

4. **Architecture Decisions**
   - **Headless Chrome Instrumentation**: Use Browserless with Puppeteer Core to guarantee exact headless Chrome parity with production client visitors.
   - **Dual Viewport Audit**: Test both desktop (1440px) and mobile (390px) to verify responsive behavior and hydration integrity across breakpoints.

5. **Pseudo Code**
   ```shade
   DATA {
     projectId: "R60Z8o2lCHIu3neoIwsu",
     targetUrl: "https://happier-anything-775440.framer.app"
   }
   LOGIC {
     // 1. Publish
     session = FramerAgent.connectSession(projectId)
     publishResult = session.publish()
     deployments = session.getDeployments()
     
     // 2. Dev & Screenshot Inspection
     browser = Browserless.connect()
     page = browser.newPage()
     page.trackConsoleErrors()
     page.trackNetworkFailures()
     page.goto(targetUrl)
     domAudit = page.evaluate(() => inspectCanvasAndDOM())
     desktopShot = page.screenshot(desktop)
     mobileShot = page.screenshot(mobile)
   }
   RENDER {
     Report(publishResult, domAudit, desktopShotUrl, mobileShotUrl)
   }
   ```
