/**
 * real-bundle.spec.ts — Tier 1 gate
 * ==================================
 * Loads the REAL built bundle the way Deephaven does (CJS via
 * `new Function(module, exports, require, text)`) and asserts the shape the
 * host relies on: a plugin descriptor with an `eventMapping` entry for
 * `deephaven_plugin_notification.event`, and no element mapping (this plugin
 * renders nothing — notifications are triggered by events).
 */
import { test, expect } from "@playwright/test";
import { gotoHarness } from "./harness";

const NOTIFICATION_EVENT = "deephaven_plugin_notification.event";

test.beforeEach(async ({ page }) => {
  await gotoHarness(page);
});

test("the bundle loads as CommonJS and exposes the event handler", async ({
  page,
}) => {
  const info = await page.evaluate(() => window.__harness.pluginInfo());
  expect(info.name).toBe("deephaven-plugin-notification");
  expect(info.eventName).toBe(NOTIFICATION_EVENT);
  expect(info.hasHandler).toBe(true);
  // An event-only plugin contributes no elements.
  expect(info.elementKeys).toEqual([]);
});

test("a malformed event is ignored rather than throwing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => window.__harness.send({}));
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
