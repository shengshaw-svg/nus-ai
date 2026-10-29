import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

const links = new Map();
const port = Number(Bun.env.PORT || 3000);
const baseUrl = Bun.env.BASE_URL
  ? new URL(Bun.env.BASE_URL).origin
  : Bun.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${Bun.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${port}`;
const publicDir = Bun.env.PUBLIC_DIR ? resolve(Bun.env.PUBLIC_DIR) : null;
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function randomCode() {
  let code = "";
  const bytes = new Uint8Array(6);

  while (code.length < 6) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < 248) code += alphabet[byte % alphabet.length];
      if (code.length === 6) break;
    }
  }

  return code;
}

function uniqueCode() {
  let code;
  do {
    code = randomCode();
  } while (links.has(code));
  return code;
}

async function serveStaticFile(pathname) {
  if (!publicDir) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = resolve(publicDir, relativePath);
  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${sep}`)) return null;

  try {
    if (!(await stat(filePath)).isFile()) return null;
  } catch {
    return null;
  }

  const file = Bun.file(filePath);
  return new Response(file, {
    headers: {
      ...corsHeaders,
      "Content-Type": file.type || "application/octet-stream",
    },
  });
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "POST" && url.pathname === "/api/links") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      if (typeof body?.url !== "string") {
        return jsonResponse({ error: "url must be a valid HTTP or HTTPS URL" }, 400);
      }

      let originalUrl;
      try {
        originalUrl = new URL(body.url);
      } catch {
        return jsonResponse({ error: "url must be a valid HTTP or HTTPS URL" }, 400);
      }

      if (originalUrl.protocol !== "http:" && originalUrl.protocol !== "https:") {
        return jsonResponse({ error: "url must be a valid HTTP or HTTPS URL" }, 400);
      }

      const code = uniqueCode();
      const link = {
        code,
        url: originalUrl.href,
        shortUrl: `${baseUrl}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return jsonResponse(link, 201);
    }

    if (request.method === "GET" && url.pathname === "/api/links") {
      return jsonResponse(Array.from(links.values()));
    }

    if (request.method === "GET") {
      const staticResponse = await serveStaticFile(url.pathname);
      if (staticResponse) return staticResponse;

      const code = url.pathname.slice(1);
      if (code && !code.includes("/")) {
        const link = links.get(code);
        if (link) {
          link.hits += 1;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, Location: link.url },
          });
        }
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
});

console.log(`Snip backend listening on port ${port}`);