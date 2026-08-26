#!/usr/bin/env node
/**
 * simulate-dh-loader.mjs
 * ======================
 * Reproduces EXACTLY how the Deephaven web client loads a JS plugin bundle:
 * `@deephaven/app-utils` → loadRemoteModule → `@paciolan/remote-module-loader`,
 * which fetches the bundle text and evaluates it with
 *
 *     new Function('module', 'exports', 'require', text)
 *
 * i.e. a CommonJS sandbox whose `require` resolves ONLY a fixed map of host
 * modules (react, @deephaven/*, ...). A top-level ESM `import` statement is a
 * SyntaxError in that sandbox.
 *
 * This is a pure-Node regression test (no browser needed). It also guards the
 * externals contract: every module this bundle leaves external MUST be one the
 * host actually provides, or it will fail to load in the real IDE.
 *
 * Exit 0 = bundle loads as Deephaven loads it and exposes a valid element
 * plugin with the expected event handler. Exit 1 = it would fail in DH.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.resolve(__dirname, "../../src/js/dist/index.js");

const NOTIFICATION_EVENT = "deephaven_plugin_notification.event";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`✓ ${msg}`);
}

if (!fs.existsSync(BUNDLE)) {
  fail(`bundle not found at ${BUNDLE} — run \`npm run build\` in src/js first`);
}
const text = fs.readFileSync(BUNDLE, "utf8");

// ── Host module map, mirroring what Deephaven's require shim provides ────────
// Only bare specifiers the host knows. Anything else — a code-split sibling
// chunk, or a dependency wrongly marked external — throws below, exactly as it
// would in the browser.
const PluginType = { ELEMENT_PLUGIN: "element", WIDGET_PLUGIN: "widget" };
const toastCalls = [];
const hostModules = {
  react: {},
  "react-dom": {},
  "@deephaven/components": {
    ToastQueue: {
      info: (...args) => toastCalls.push(args),
    },
  },
  "@deephaven/log": {
    module: () => ({ debug() {}, info() {}, warn() {}, error() {} }),
  },
  "@deephaven/plugin": { PluginType },
};

const required = [];
function hostRequire(name) {
  required.push(name);
  if (Object.prototype.hasOwnProperty.call(hostModules, name)) {
    return hostModules[name];
  }
  throw new Error(
    `Cannot find module '${name}'. The Deephaven require shim only resolves ` +
      `host-provided modules; '${name}' must be bundled INTO index.js, not ` +
      `left external or split into a sibling chunk.`,
  );
}

// ── Evaluate exactly like @paciolan/remote-module-loader ─────────────────────
const module = { exports: {} };
let factory;
try {
  factory = new Function("module", "exports", "require", text);
} catch (e) {
  fail(
    `bundle is not loadable by Deephaven: ${e.message}\n` +
      `   This is the ESM-in-CJS failure. The bundle must be CommonJS ` +
      `(no top-level import/export statements).`,
  );
}
try {
  factory(module, module.exports, hostRequire);
} catch (e) {
  fail(`bundle threw while evaluating in the CJS sandbox: ${e.stack}`);
}
ok(
  "bundle evaluated via new Function(module, exports, require) — no ESM syntax error",
);
ok(`required only host-provided modules: ${required.join(", ")}`);

// ── Validate the exported plugin, like getPluginModuleValue() does ───────────
const exported = module.exports;
const plugin =
  exported && exported.name != null ? exported : exported && exported.default;
if (!plugin || plugin.name == null) {
  fail(
    `no plugin value exported. module.exports keys: ${Object.keys(exported)}`,
  );
}
ok(`exported plugin name = '${plugin.name}'`);

if (plugin.name !== "deephaven-plugin-notification") {
  fail(`unexpected plugin name '${plugin.name}'`);
}
if (plugin.type !== PluginType.ELEMENT_PLUGIN) {
  fail(
    `plugin.type is '${plugin.type}', expected ELEMENT_PLUGIN ('${PluginType.ELEMENT_PLUGIN}')`,
  );
}
ok(`plugin.type = ELEMENT_PLUGIN`);

if (!plugin.eventMapping || typeof plugin.eventMapping !== "object") {
  fail("plugin.eventMapping is missing");
}
const handler = plugin.eventMapping[NOTIFICATION_EVENT];
if (typeof handler !== "function") {
  fail(
    `eventMapping['${NOTIFICATION_EVENT}'] is not a function (got ${typeof handler})`,
  );
}
ok(`eventMapping['${NOTIFICATION_EVENT}'] is a handler`);

// An event-only plugin contributes no elements.
const elementKeys = Object.keys(plugin.mapping ?? {});
if (elementKeys.length > 0) {
  fail(`expected no element mapping, got: ${elementKeys.join(", ")}`);
}
ok("plugin.mapping is empty (event-only plugin)");

// ── The toast fallback must reach the HOST's ToastQueue, not a bundled copy ──
// Notification is undefined in plain Node, so the handler takes the fallback
// path. If @deephaven/components had been bundled instead of externalized, the
// host stub above would never be called.
if (/actionLabel/.test(text) === false) {
  fail("toast fallback code is missing from the bundle");
}
handler({ title: "Title", description: "Body" });
await new Promise((resolve) => setTimeout(resolve, 0));
if (toastCalls.length !== 1) {
  fail(
    `expected the fallback to call the host's ToastQueue.info once, got ${toastCalls.length} call(s) — ` +
      `is '@deephaven/components' still external in vite.config.js?`,
  );
}
if (toastCalls[0][0] !== "Title: Body") {
  fail(`unexpected toast message: ${JSON.stringify(toastCalls[0][0])}`);
}
ok("toast fallback calls the host-provided ToastQueue");

console.log("\n✅ Bundle loads exactly as Deephaven loads it.");
