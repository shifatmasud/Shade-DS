---
name: browserless-screenshot
description: >
  Captures high-resolution browser screenshots of development or live web applications
  using Browserless cloud browser and automatically hosts them on free temporary hosting
  services with public direct URLs.
---

# Browserless Screenshot Skill

A beginner-friendly guide and automated toolkit to take instant, high-fidelity screenshots of your web application, UI components, or external URLs using the Browserless cloud rendering engine, and host them on temporary image servers for fast preview and sharing.

---

# Prerequisites & Quick Setup

### 1. Environment Variable
Make sure your environment contains the Browserless API token:
- Variable: `BROWSERLESS_TOKEN`
- The script automatically masks this token in logs to keep your environment secure.

### 2. Available Endpoints
The script automatically connects with built-in multi-region failover across:
- `wss://production-sfo.browserless.io?token=...`
- `wss://chrome.browserless.io?token=...`

---

# Beginner Quick Start (One-Liner Commands)

### 📸 Default App Capture
Snap a crisp retina screenshot of the default preview app and get an instant public image URL:
```bash
npx tsx plugins/browserless-screenshot/screenshot.ts
```

### 🎯 Capture Any Custom Website URL
Provide the target URL directly as the first argument:
```bash
npx tsx plugins/browserless-screenshot/screenshot.ts "https://github.com"
```

### 📜 Capture the Full Scrollable Page
To capture from top to bottom (full scroll height):
```bash
npx tsx plugins/browserless-screenshot/screenshot.ts --full-page
```

### 🔍 Capture a Specific UI Component or Selector
To isolate and capture just a specific container or card (e.g., `#stage`, `.hero-banner`):
```bash
npx tsx plugins/browserless-screenshot/screenshot.ts --selector "#stage-viewport"
```

---

# CLI Options & Flag Reference

| Flag | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `[Target URL]` | `--url <url>` | The web page URL to load and capture | Shared Preview URL |
| `--output <path>` | `-o <path>` | Local file destination path | `dev_screenshot.png` |
| `--full-page` | `-f` | Capture entire scrollable document height | `false` |
| `--selector <css>` | `-s <css>` | Clip only the element matching this CSS selector | `undefined` |
| `--width <px>` | | Browser viewport width in pixels | `1440` |
| `--height <px>` | | Browser viewport height in pixels | `900` |
| `--dpr <n>` | | Device Pixel Ratio (Retina multiplier) | `2` (2x Retina) |
| `--delay <ms>` | | Settle time for animations/WebGL to finish | `2500` ms |
| `--timeout <ms>` | | Maximum navigation timeout limit | `45000` ms |
| `--light` / `--dark` | | Emulates `prefers-color-scheme` | `dark` |
| `--no-upload` | | Save screenshot locally without uploading | `false` |
| `--json` | | Output machine-readable JSON results | `false` |
| `--help` | `-h` | Display the CLI help screen | |

---

# Programmatic Usage in TypeScript

You can also import and use the screenshot engine in your own scripts or backend services:

```typescript
import { takeAndHostScreenshot } from './plugins/browserless-screenshot/screenshot';

async function run() {
  const result = await takeAndHostScreenshot({
    targetUrl: 'https://ais-pre-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app',
    viewportWidth: 1920,
    viewportHeight: 1080,
    deviceScaleFactor: 2,
    settleDelayMs: 3000,
    colorScheme: 'dark',
  });

  console.log('Success:', result.success);
  console.log('Direct Image URL:', result.directUrl);
  console.log('Mirrors:', result.mirrors);
}

run();
```

---

# Free Temporary Hosting Services Used

When `--no-upload` is not specified, screenshots are automatically mirrored to multiple free temporary hosting providers:

1. **Uguu CDN (`uguu.se`)**: Fast direct image hosting (`.png` link for instant embedding and viewing).
2. **tmpfiles.org**: High-bandwidth viewer page and direct download URL.
3. **Litterbox (`catbox.moe`)**: 24-hour persistent direct URL.
4. **0x0.st**: Lightweight direct file host.

---

# Common Troubleshooting

- **Page renders blank or black screen**: Increase the settle delay (`--delay 4000`) so 3D canvases and client animations have enough time to initialize.
- **Selector not found error**: Ensure the target CSS selector is present in the rendered HTML after client-side hydration.
- **Timeout on heavy websites**: Increase timeout with `--timeout 60000`.
