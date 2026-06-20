---
name: "cloudflare-integration"
description: |
  Deploy, configure, and scale serverless workers, static applications, and integrations on Cloudflare. Specializes in Wrangler-based automation, Accountless/Temporary deployments (using wrangler deploy --temporary), and Binding resources.

  Use this skill in the following scenarios:
  * Serverless Deployment: When designing, scaffolding, or deploying Cloudflare Workers or Cloudflare Pages.
  * Accountless Testing: When performing frictionless testing or instant production previews without pre-configuring accounts or secrets.
  * Binding and Resources Integration: When binding D1 Databases, KV Stores, R2 Storage Buckets, or Hyperdrive to serverless handlers.
  * Configuration Tuning: When crafting, optimizing, or debugging wrangler.toml configurations.
---

# Cloudflare Serverless and Worker Integrations

This skill guides the design, setup, configuration, and deployment of serverless code, databases, and static frontends directly to Cloudflare's global edge network. It emphasizes frictionless testing workflows, structured configuration, and strict engineering patterns suited for AI-agent automation.

---

## 1. Accountless Deployment Flow (`--temporary`)

To streamline testing, staging, and prototype demos, Cloudflare provides an **Accountless/Temporary deployment pipeline** within Wrangler. This allows developers and AI agents to instantly publish fully functional serverless workers to a live public edge subdomain **without registering, logging in, or specifying account credentials**.

### Core Commands
* **Instant Deployment**:
  ```bash
  npx wrangler deploy --temporary
  ```
* **Development Sandbox**:
  ```bash
  npx wrangler dev --temporary
  ```

### Step-by-Step Lifecycle
1. **Triggering Deployment**: When `npx wrangler deploy --temporary` is run, Wrangler bundles the local project and contacts Cloudflare's ephemeral registration endpoint.
2. **On-the-fly Account Provisioning**: Cloudflare provisions an anonymous, isolated dashboard sandbox.
3. **URL Issuance**:
   * **Worker URL**: Wrangler outputs a live edge routing URL like `https://ephemeral-worker-abc-123.workers.dev`.
   * **Dashboard Link**: A temporary console management link is created for quick monitoring.
   * **Claim URL**: Wrangler spits out an **Account Claim URL** at the end of the terminal log:
     ```text
     🎁 Your temporary account has been created!
     Claim your account to make these deployments permanent and manage them anytime:
     https://dash.cloudflare.com/claim/account?token=<secure-token>
     ```
4. **Transition to Permanent Workspace**: Clicking the claim URL lets developers link the active epinephrine workspace, workers, KV stores, and bindings directly to an existing or new email-backed permanent Cloudflare profile seamlessly.

### Ephemeral Limits & Boundaries
* **Expiration**: Assets and routes created under temporary deployments exist for up to **24 hours** from initial setup unless claimed.
* **Volume/Capacity**: Strict sub-limits are applied to ephemeral accounts (e.g., lower request-per-minute thresholds and limited compute duration budgets per request).
* **Bindings Limitation**: Temporary accounts can use basic KV and D1 binds in-memory during development, but heavy transactional production services should be migrated to registered profiles right away.

---

## 2. Wrangler Configuration & Project Layout

All serverless workloads are steered by `wrangler.toml` located in the workspace root.

### Compliant `wrangler.toml` Schema
```toml
name = "my-edge-worker"
main = "src/index.ts"
compatibility_date = "2024-03-01"

[vars]
ENVIRONMENT = "production"
API_ENDPOINT = "https://api.myworker.com"

# Binding KV namespaces, D1 databases, and R2 buckets
[[kv_namespaces]]
binding = "CACHE_STORE"
id = "xxxxxxxxxxxxxxxxx"

[[d1_databases]]
binding = "DB"
database_name = "prod-db"
database_id = "xxxxxxxxxxxxxxxxx"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "user-media-bucket"
```

### Edge Worker Entrypoint Pattern (TypeScript)
Developers must rely exclusively on **ES Modules configuration** using default exports to declare fetch triggers.

```typescript
export interface Env {
  ENVIRONMENT: string;
  API_ENDPOINT: string;
  CACHE_STORE: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Simple routing paradigm
    if (url.pathname === "/api/health") {
      return Response.json({ status: "healthy", env: env.ENVIRONMENT });
    }

    if (url.pathname === "/api/data") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM entries LIMIT 10").all();
        return Response.json({ results });
      } catch (err: any) {
        return new Response(err.message || "Database Query Failure", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
```

---

## 3. Storage and Binding Systems

Bindings are secure linkages between your edge compute worker and persistent global storage structures.

### Key-Value Store (KV)
* Best for: Read-heavy key-value metadata, session data, user profiles.
* Operations are eventually consistent globally.
* Code Pattern:
  ```typescript
  // Write to KV
  await env.CACHE_STORE.put("session:1234", JSON.stringify(userData), { expirationTtl: 3600 });
  // Read from KV
  const data = await env.CACHE_STORE.get("session:1234");
  ```

### D1 Database (Edge SQL Database)
* Best for: Secure, durable relational schemas with full ACID compliance. Powered by SQLite.
* Code Pattern:
  ```typescript
  // Query D1
  const balance = await env.DB.prepare("SELECT balance FROM users WHERE id = ?")
    .bind(userId)
    .first<number>("balance");
  ```

### R2 Storage (S3-Compatible Object Store)
* Best for: Large static files, image uploads, multimedia backups, and unstructured blob databases without egress fees.
* Code Pattern:
  ```typescript
  // Store an image blob
  await env.BUCKET.put(`avatars/${userId}.png`, fileStream, {
    httpMetadata: { contentType: "image/png" }
  });
  // Retrieve blob
  const object = await env.BUCKET.get(`avatars/${userId}.png`);
  if (!object) return new Response("Not Found", { status: 404 });
  return new Response(object.body);
  ```

---

## 4. Development & Deployment Quality Guidelines

Follow these practices to avoid edge runtime crashes:

1. **Lazy Key Initialization**: Never evaluate asynchronous bindings or environment key values in global module space. Always evaluate them dynamically on each incoming execution inside `fetch()`.
2. **No Native FS Access**: Workers run in an isolated V8 isolate runtime. Standard filesystem modules (`fs`, `path`) do not exist. Use KV, D1, or direct URL requests to fetch dynamic assets.
3. **Keep Bundle Sizes Small**: Minimize dependencies. Use lightweight alternative micro-libraries (e.g., `hono` instead of full Express, standard `fetch` instead of `axios`).
4. **Environment vars vs Secrets**:
   * Plain variables: set inside `[vars]` in `wrangler.toml`
   * Sensitive tokens/API keys: add via `wrangler secret put KEY_NAME` in production, or inside local `.dev.vars` for local runs.
