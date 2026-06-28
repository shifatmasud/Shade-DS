# ADR: Screenshot Implementation

## Context
The user wants a screenshot of the preview in the terminal.

## Decision
We will use a Node.js script with `puppeteer-core`. 
We will attempt to connect to a Browserless WebSocket. 
Since no API key is provided, we will assume a local or pre-configured Browserless endpoint if available, or ask for one if it fails.
However, for this specific environment, I will try to use a known Browserless endpoint if one exists, otherwise I will use a direct `npx` approach if feasible.

## Rationale
`puppeteer-core` is lightweight as it doesn't include the Chromium binary, which is ideal for containerized environments where we can offload the browser execution to Browserless.
