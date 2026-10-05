---
name: "vercel-cli"
description: |
  Deploy, configure, and orchestrate serverless applications, Edge networks, and environments using the Vercel CLI (vercel). Guides token-based authentication on headless platforms, automatic linking protocols, and non-interactive deployments.

  Use this skill in the following scenarios:
  * Static & SSR Deployments: When provisioning, scaffolding, or deploying projects to the Vercel edge platform.
  * Headless Continuous Deployment: Injecting tokens like 'VERCEL_TOKEN' and bypassing interactive setup confirmation screens.
  * Environment Variable Synchronization: Running 'vercel env pull' or setting parameters remotely.
---

# Vercel CLI (vercel) Setup & Deployment Skill

This skill governs best practices, executable structures, and commands for managing static hosting, Server-Side Rendering (SSR), API routes, and cloud environments via the Vercel CLI (`vercel`).

---

## 1. Zero-Interactive Headless Authentications

By default, the Vercel CLI attempts to redirect users to a web login portal. For sandboxed filesystems, remote virtual environments, or terminal runners, you must bypass login by supplying a Vercel personal access token or CI token.

### Executing with Vercel Token
Register or retrieve an access token from the Vercel account settings, and specify it using either the `VERCEL_TOKEN` environment variable or the `--token` flag:

```bash
# Environment Variable Method
export VERCEL_TOKEN="your_secure_vercel_token_here"
npx vercel whoami

# Inline Argument Option
npx vercel whoami --token=your_secure_vercel_token_here
```

### Team/Organization Scoping
If your project is mapped to an enterprise seat or cooperative team, append the `--scope` argument to direct commands cleanly:

```bash
npx vercel login --token="$VERCEL_TOKEN"
npx vercel projects list --scope="my-team-slug"
```

---

## 2. Dynamic Team Linking & Environment Automation

When deploying a pipeline for the first time, Vercel initiates an interactive quiz asking for team identifiers, settings overrides, and project linkage. To sidestep this completely in AI or script execution:

### Automated Project Binding
Provide Vercel's systemic environment variables before issuing a deployment. These instruct Vercel to bypass binding queries:

* `VERCEL_ORG_ID`: Found under team settings.
* `VERCEL_PROJECT_ID`: Found under project settings.

```bash
# Link project non-interactively
VERCEL_ORG_ID="team_xxx" VERCEL_PROJECT_ID="prj_yyy" npx vercel link --yes
```

---

## 3. High-Frequency Commands Reference

### Deploying Preview and Production Builds
* **Triggering Preview Deployment**:
  ```bash
  # Instantly bundle and ship code to a temporary preview subdomain
  npx vercel --token="$VERCEL_TOKEN" --yes
  ```
* **Triggering Production Deployment**:
  ```bash
  # Ship build directly to the live production domain alias
  npx vercel --token="$VERCEL_TOKEN" --prod --yes
  ```

### Managing Environment Variables
Vercel environment rules should be loaded directly inside localized runtime frames:
* **Pull Environment Configuration**:
  ```bash
  # Creates a Decrypted .env.local locally containing runtime variables
  npx vercel env pull .env.local --token="$VERCEL_TOKEN" --yes
  ```
* **Add Remote Secret**:
  ```bash
  npx vercel env add DATABASE_URL production "postgresql://..." --token="$VERCEL_TOKEN"
  ```

---

## 4. Architectural Control: `vercel.json`

Fine-tune redirect targets, API routes, custom caching, and edge routing logic inside `vercel.json` at the root folder:

```json
{
  "version": 2,
  "cleanUrls": true,
  "redirects": [
    { "source": "/old-blog/:path*", "destination": "/posts/:path*", "statusCode": 301 }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## 5. Automation Quality Guidelines

1. **Always use `--yes`**: Never omit `--yes` (or `-y`) during deployment or linking commands as it prevents hanging on directory matching queries.
2. **Build and Deployment Warnings**: In full-stack platforms, ensure api pathways match `/api/*` structure before configuring custom server-side functions.
3. **Verify Dev Porting**: When running local server debugging, Vercel maps client routes via `vercel dev --port 3000`. Keep dev frameworks isolated properly to port `3000` to remain readable on our ingress proxies.
