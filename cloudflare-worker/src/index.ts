interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  MCP_CONFIG: KVNamespace;
  SYNC_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight for all endpoints
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-session-id, x-sync-secret, *",
          "Access-Control-Expose-Headers": "*",
        }
      });
    }

    // 1. Endpoint to sync / register active backend tunnel URL from AI Studio container
    if (url.pathname === "/sync" && request.method === "POST") {
      const authHeader = request.headers.get("x-sync-secret") || url.searchParams.get("key");
      if (authHeader !== env.SYNC_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const body: any = await request.json();
        const backendUrl = body?.backendUrl;
        if (!backendUrl || typeof backendUrl !== "string") {
          return new Response("Invalid backendUrl", { status: 400 });
        }

        await env.MCP_CONFIG.put("ACTIVE_BACKEND_URL", backendUrl);
        await env.MCP_CONFIG.put("LAST_SYNC_AT", new Date().toISOString());

        return Response.json({
          success: true,
          registeredBackend: backendUrl,
          syncedAt: new Date().toISOString()
        });
      } catch (err: any) {
        return new Response(err.message, { status: 500 });
      }
    }

    // 2. Health check of edge worker
    if (url.pathname === "/edge-health") {
      const activeBackend = await env.MCP_CONFIG.get("ACTIVE_BACKEND_URL");
      const lastSync = await env.MCP_CONFIG.get("LAST_SYNC_AT");
      return Response.json({
        status: "edge-online",
        domain: url.hostname,
        activeBackend: activeBackend || "unconfigured",
        lastSync: lastSync || null
      });
    }

    // 3. Retrieve currently registered backend from KV
    let activeBackend = await env.MCP_CONFIG.get("ACTIVE_BACKEND_URL");
    if (!activeBackend) {
      activeBackend = "https://inflation-settled-cathedral-emphasis.trycloudflare.com";
    }

    // Strip trailing slash if present
    activeBackend = activeBackend.replace(/\/+$/, "");

    // Normalize target URL
    const targetUrl = new URL(url.pathname + url.search, activeBackend);

    // Forward request to active backend container
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set("X-Forwarded-Host", url.hostname);
    forwardHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    try {
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "follow"
      });

      // Clone response and attach full CORS & streaming headers
      const resHeaders = new Headers(response.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
      resHeaders.set("Access-Control-Allow-Headers", "*");
      resHeaders.set("Access-Control-Expose-Headers", "*");
      resHeaders.set("X-Accel-Buffering", "no");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders
      });
    } catch (err: any) {
      return Response.json({
        error: "Failed to forward request to active AI Studio container backend",
        targetUrl: targetUrl.toString(),
        message: err.message
      }, { status: 502 });
    }
  }
};
