#!/usr/bin/env node
/**
 * Static file server for the Tier-1 harness.
 *
 * Routes:
 *   GET /                           → harness/index.html
 *   GET /adapter/plugin-adapter.js  → harness/plugin-adapter.js
 *   GET /plugin/index.js            → src/js/dist/index.js
 *
 * Usage:  node server.js [port]
 * Default port: 19877
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "../../../src/js/dist");
const PORT = Number(process.argv[2] ?? process.env.HARNESS_PORT ?? 19877);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function serve(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`404 Not Found: ${filePath}`);
    console.error("[server] 404", filePath);
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/" || url === "/index.html") {
    serve(res, path.join(__dirname, "index.html"));
  } else if (url === "/adapter/plugin-adapter.js") {
    serve(res, path.join(__dirname, "plugin-adapter.js"));
  } else if (url === "/plugin/index.js") {
    serve(res, path.join(DIST_DIR, "index.js"));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[harness-server] listening on http://127.0.0.1:${PORT}`);
});
