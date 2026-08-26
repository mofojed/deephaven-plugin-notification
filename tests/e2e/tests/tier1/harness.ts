import { type Page } from "@playwright/test";

export type HarnessNotification = {
  title: string;
  options: {
    body?: string;
    icon?: string;
    tag?: string;
    silent?: boolean;
  };
  hasOnClick: boolean;
  hasOnClose: boolean;
};

export type HarnessToast = {
  message: string;
  actionLabel?: string;
  hasAction: boolean;
};

export type Harness = {
  installNotification(opts?: {
    permission?: NotificationPermission;
    requestPermissionResult?: NotificationPermission;
    requestPermissionThrows?: boolean;
  }): void;
  removeNotification(): void;
  send(
    payload: Record<string, unknown>,
    handlers?: { onClick?: boolean; onClose?: boolean },
  ): void;
  notifications(): HarnessNotification[];
  fire(index: number, handler: "onclick" | "onclose"): boolean;
  toasts(): HarnessToast[];
  fireToastAction(index: number): boolean;
  calls(): { onClick: number; onClose: number };
  pluginInfo(): {
    name: string;
    eventName: string;
    hasHandler: boolean;
    elementKeys: string[];
  };
  reset(): void;
};

declare global {
  interface Window {
    __harness: Harness;
    __harnessReady?: boolean;
  }
}

export async function gotoHarness(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => window.__harnessReady === true, {
    timeout: 15_000,
  });
  await page.evaluate(() => window.__harness.reset());
}

// The event handler is async, so these are meant to be polled with expect.poll
// rather than read once.
export const notifications = (page: Page) =>
  page.evaluate(() => window.__harness.notifications());

export const toasts = (page: Page) =>
  page.evaluate(() => window.__harness.toasts());

export const calls = (page: Page) =>
  page.evaluate(() => window.__harness.calls());
