/**
 * plugin-adapter.js  (browser, ES module)
 * =======================================
 * Loads the plugin bundle EXACTLY the way the Deephaven web client does — by
 * fetching the bundle text and evaluating it with
 *
 *     new Function('module', 'exports', 'require', text)
 *
 * (this is what @deephaven/app-utils → @paciolan/remote-module-loader does).
 * A `require` shim resolves only the host modules the bundle imports. The
 * @deephaven/components stub records ToastQueue.info calls, which is how the
 * tests observe the toast fallback — and proves the bundle uses the HOST's
 * ToastQueue rather than a bundled copy.
 *
 * The adapter does NOT re-implement the handler. The plugin's only export is
 * the plugin descriptor, so the ONLY way to drive it is through the
 * descriptor's `eventMapping` handler — the same call deephaven.ui makes when
 * the server sends an event.
 */

const NOTIFICATION_EVENT = "deephaven_plugin_notification.event";

export const toasts = [];

const noop = () => {};
const logger = {
  debug: noop,
  info: noop,
  warn: (...a) => console.warn("[Notification]", ...a),
  error: (...a) => console.error("[Notification]", ...a),
};

const hostModules = {
  react: {},
  "react-dom": {},
  "@deephaven/components": {
    ToastQueue: {
      info: (message, options) => toasts.push({ message, options }),
    },
  },
  "@deephaven/log": { module: () => logger },
  "@deephaven/plugin": {
    PluginType: {
      ELEMENT_PLUGIN: "ELEMENT_PLUGIN",
      DASHBOARD_PLUGIN: "DASHBOARD_PLUGIN",
    },
  },
};

function hostRequire(name) {
  if (Object.prototype.hasOwnProperty.call(hostModules, name)) {
    return hostModules[name];
  }
  throw new Error(
    `[adapter] require('${name}') not provided by the host shim — the bundle ` +
      `must bundle this inline, not leave it external or split into a chunk.`,
  );
}

const bundleText = await fetch("/plugin/index.js").then((r) => {
  if (!r.ok) throw new Error(`failed to fetch /plugin/index.js: ${r.status}`);
  return r.text();
});

const module = { exports: {} };
// If the bundle were ESM, the next line throws
// "SyntaxError: Cannot use import statement outside a module".
const factory = new Function("module", "exports", "require", bundleText);
factory(module, module.exports, hostRequire);

const pluginDescriptor =
  module.exports && module.exports.name != null
    ? module.exports
    : module.exports && module.exports.default;

export const PLUGIN = pluginDescriptor;
export const PLUGIN_NAME = pluginDescriptor?.name;
export const EVENT_NAME = NOTIFICATION_EVENT;
export const EVENT_HANDLER =
  pluginDescriptor?.eventMapping?.[NOTIFICATION_EVENT];

if (typeof EVENT_HANDLER !== "function") {
  console.error(
    "[adapter] event handler not found. plugin keys:",
    pluginDescriptor && Object.keys(pluginDescriptor),
  );
}

/**
 * Deliver one event to the plugin, exactly as deephaven.ui does when the server
 * sends `deephaven_plugin_notification.event`.
 */
export function sendEvent(payload) {
  if (typeof EVENT_HANDLER !== "function") {
    console.error("[adapter] no event handler to send to");
    return;
  }
  EVENT_HANDLER(payload || {});
}
