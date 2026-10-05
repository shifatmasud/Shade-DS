# Tech Spec 

1. **Objective**
Integrate Raylight and Upsy Model Context Protocol (MCP) servers with full OAuth authentication. Provide the user with the necessary callback URLs to configure their OAuth providers and enable a "Connect" flow in the application.

2. **Success Criteria**
- OAuth callback routes (`/api/auth/callback/raylight`, `/api/auth/callback/upsy`) implemented in `server.ts`.
- Centralized token storage (e.g., in a `tokens.json` or local storage proxy) to persist session tokens for MCP requests.
- A "Connect" UI in the app that initiates the OAuth popup.
- The user is provided with exact callback URLs for their Raylight/Upsy dashboards.

3. **Project Requirements**
- Update `server.ts` with OAuth initiate and callback endpoints.
- Implement a simple "Settings" or "Integrations" section in `Home.tsx` to trigger auth.
- Persist tokens securely (for this demo, we'll use a local file `tokens.json` or simple session state).
- Update `mcp-config.json` to be able to use these tokens.

4. **Architecture Decisions**
- **Popup Flow**: Use the `oauth-integration` skill pattern (Popup → Callback → postMessage → Parent).
- **Callback URIs**:
    - Raylight: `https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/auth/callback/raylight`
    - Upsy: `https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/auth/callback/upsy`
- **Environment Variables**: Use `RAYLIGHT_CLIENT_ID`, `RAYLIGHT_CLIENT_SECRET`, `UPSY_CLIENT_ID`, `UPSY_CLIENT_SECRET`.

5. **Pseudo Code**
```typescript
// server.ts
app.get('/api/auth/raylight', (req, res) => {
  const url = `https://jkfgfwhjinktxvvmhpiy.supabase.co/auth/v1/authorize?client_id=${process.env.RAYLIGHT_CLIENT_ID}&redirect_uri=${APP_URL}/api/auth/callback/raylight&response_type=code`;
  res.json({ url });
});
```
