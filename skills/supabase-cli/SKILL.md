---
name: "supabase-cli"
description: |
  Deploy, configure, and orchestrate Supabase backends (PostgreSQL, Authentication, Realtime, Edge Functions, and Storage) using the Supabase CLI (supabase). Explains headless access tokens, migrations workflows, local docker-based development, and automatic TypeScript type generation.

  Use this skill in the following scenarios:
  * Database Migrations: Scaffolding, scripting, pull/push, and seeding PostgreSQL state schemas.
  * Local Dev Sandbox: Running Supabase services locally inside Docker containers.
  * TypeScript Generation: Automatically compiling TypeScript type contracts directly from actual SQL tables structures.
  * Edge Functions: Authoring and deploying Deno-based edge workers to Supabase.
---

# Supabase CLI (supabase) Integration Skill

This skill guides the design, setup, configuration, and automated deployment of Supabase's full-stack offering using the Supabase CLI (`supabase`). It details local schemas, continuous integrations, and high-quality automation conventions.

---

## 1. Remote Orchestration & Headless Access Tokens

For non-interactive integrations, virtual actions, or agent container deployments, bypass prompt logins by verifying authentication via a personal access token or target project reference.

### Global Headless Token Auth
Generate an access token in the Supabase Dashboard, then pass it as an environment variable (`SUPABASE_ACCESS_TOKEN`):

```bash
export SUPABASE_ACCESS_TOKEN="sbp_your_secure_access_token_here"
npx supabase projects list
```

### Direct Project Scoping
Most production CLI operations (such as db schema sync, migrations, and functions) can execute directly by passing the project reference string via the `--project-ref` option:

```bash
npx supabase db push --project-ref "your-project-ref-id" --password "your-db-password"
```

---

## 2. Local Docker-Based Development

The local Supabase development stack relies on having a running Docker engine. It launches Postgres, Auth, PostgREST, Realtime, Storage, and Studio on your local system:

```bash
# Initialize a new Supabase configuration folder structure (creates ./supabase)
npx supabase init

# Start local services (Requires Docker)
npx supabase start

# View local service credentials, API endpoints, and Local Studio URL (typically port 54321)
npx supabase status

# Force shut local development services
npx supabase stop
```

---

## 3. Database migrations lifecycle (Best Practice)

Rather than manipulating databases directly, follow a rigorous migrations pipeline to ensure changes are tracked and deployable:

### Creating schema migration scripts
```bash
# Spin up an empty migration script
npx supabase migration new create_accounts_table

# Automatically generate a diff script comparing local DB database tables against schema changes:
npx supabase db diff --local > supabase/migrations/$(date +%Y%m%d%H%M%S)_schema.sql
```

### Applying Migrations
Apply your SQL scripts securely to production remote servers:

```bash
# Push migrations local history safely to the remote instance
npx supabase db push --project-ref "$REF_ID" --password "$DB_PASSWORD"
```

---

## 4. Automatic TypeScript Schema Type Generation

One of the most powerful features of the Supabase CLI is compiling precise, end-to-end database TS type mappings. Always generate these files whenever database structures alter!

### Generate from Local DB Stack
```bash
# Compiles local database types directly to src
npx supabase gen types typescript --local > src/types/supabase.ts
```

### Generate from Remote Cloud DB Stack
```bash
# Fetch and compile cloud db schema directly using the project reference
npx supabase gen types typescript --project-ref "$REF_ID" > src/types/supabase.ts
```

*Inside your React application, consume the generated types securely:*
```typescript
import { createClient } from "@supabase/supabase-api";
import { Database } from "./types/supabase";

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## 5. Designing & Deploying Edge Functions

Supabase Edge Functions are authored in TypeScript and run inside a serverless Deno runtime, enabling fast, close-to-user server computations.

### Scaffolding Function
```bash
npx supabase functions new handle-payment
```
This generates standard handler templates at `./supabase/functions/handle-payment/index.ts`.

### Deploying Edge Function
```bash
npx supabase functions deploy handle-payment --project-ref "$REF_ID"
```

---

## 6. Automation Quality Guidelines

1. **Explicit Passwords/Tokens**: In automation, keep passwords and secret keys safe by binding them strictly to backend `.env` structures. Never hardcode access tokens or database passwords in scripts.
2. **Local Studio Porting**: Locally initiated Supabase instances open the Studio UI at port `54321`. This is closed externally behind our ingress proxy, so focus on utilizing the CLI commands or API routes (`PORT=3000`) for data communication.
3. **Database Branching Policy**: Use separate projects or local instances for dev, staging, and production. Push changes sequentially through migrate commands instead of direct graphical console editing.
