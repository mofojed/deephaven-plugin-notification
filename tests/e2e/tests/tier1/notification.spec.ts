/**
 * notification.spec.ts — Tier 1 gate
 * ===================================
 * Drives the real built bundle through its own eventMapping handler and covers
 * every branch of showNotification: the granted path, the permission request,
 * and the two fallbacks (denied, unsupported).
 *
 * The browser's Notification API is replaced with a controllable mock so the
 * permission state is deterministic and no real OS notification fires.
 */
import { test, expect } from "@playwright/test";
import { calls, gotoHarness, notifications, toasts } from "./harness";

test.beforeEach(async ({ page }) => {
  await gotoHarness(page);
});

test("displays a notification when permission is granted", async ({ page }) => {
  await page.evaluate(() => {
    window.__harness.installNotification({ permission: "granted" });
    window.__harness.send({
      title: "Title",
      description: "Body",
      icon: "icon.png",
      tag: "tag",
      silent: true,
    });
  });

  await expect
    .poll(() => notifications(page))
    .toEqual([
      expect.objectContaining({
        title: "Title",
        options: { body: "Body", icon: "icon.png", tag: "tag", silent: true },
      }),
    ]);
  expect(await toasts(page)).toEqual([]);
});

test("wires onClick and onClose to the notification", async ({ page }) => {
  await page.evaluate(() => {
    window.__harness.installNotification({ permission: "granted" });
    window.__harness.send({ title: "Title" }, { onClick: true, onClose: true });
  });

  await expect
    .poll(() => notifications(page))
    .toEqual([expect.objectContaining({ hasOnClick: true, hasOnClose: true })]);

  await page.evaluate(() => {
    window.__harness.fire(0, "onclick");
    window.__harness.fire(0, "onclose");
  });
  expect(await calls(page)).toEqual({ onClick: 1, onClose: 1 });
});

test("requests permission when not yet determined", async ({ page }) => {
  await page.evaluate(() => {
    window.__harness.installNotification({
      permission: "default",
      requestPermissionResult: "granted",
    });
    window.__harness.send({ title: "Title" });
  });

  await expect
    .poll(() => notifications(page))
    .toEqual([expect.objectContaining({ title: "Title" })]);
  expect(await toasts(page)).toEqual([]);
});

test("falls back to a toast when permission is denied", async ({ page }) => {
  await page.evaluate(() => {
    window.__harness.installNotification({ permission: "denied" });
    window.__harness.send({ title: "Title", description: "Body" });
  });

  await expect
    .poll(() => toasts(page))
    .toEqual([
      { message: "Title: Body", actionLabel: undefined, hasAction: false },
    ]);
  expect(await notifications(page)).toEqual([]);
});

test("exposes onClick as a toast action in the fallback", async ({ page }) => {
  await page.evaluate(() => {
    window.__harness.installNotification({ permission: "denied" });
    window.__harness.send({ title: "Title" }, { onClick: true });
  });

  await expect
    .poll(() => toasts(page))
    .toEqual([{ message: "Title", actionLabel: "View", hasAction: true }]);

  await page.evaluate(() => window.__harness.fireToastAction(0));
  expect((await calls(page)).onClick).toBe(1);
});

test("falls back to a toast when the permission request is rejected", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__harness.installNotification({
      permission: "default",
      requestPermissionThrows: true,
    });
    window.__harness.send({ title: "Title", description: "Body" });
  });

  await expect
    .poll(() => toasts(page))
    .toEqual([
      { message: "Title: Body", actionLabel: undefined, hasAction: false },
    ]);
  expect(await notifications(page)).toEqual([]);
});

test("falls back to a toast when notifications are not supported", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__harness.removeNotification();
    window.__harness.send({ title: "Title", description: "Body" });
  });

  await expect
    .poll(() => toasts(page))
    .toEqual([
      { message: "Title: Body", actionLabel: undefined, hasAction: false },
    ]);
});
