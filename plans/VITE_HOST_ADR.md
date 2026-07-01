# ADR - Vite Config Host Option Update

## Context
The user requested to update the Vite configuration to export `defineConfig` with `server: { host: true }`.

## Decision
We will modify the `server` block in `vite.config.ts` to set `host: true`. To prevent breaking container routing, we will keep `port: 3000` alongside `host: true` as the environment requires all traffic to go through port 3000.

## Consequences
- Setting `host: true` instructs Vite to listen on all local and network interfaces (including LAN/public IPs).
- Keeping other parameters ensures the React application loads, resolves alias `@` paths, and serves normally on port 3000.
