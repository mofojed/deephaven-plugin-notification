"""
Notification Buttons Demo -- deephaven-plugin-notification
=========================================================
Interactive demonstration of the ``notification`` trigger API.

Open this file in the Deephaven Web IDE. The panel ``notification_demo`` appears
in the panel list and can be opened in any layout.

**What each button does**

* **Basic** -- a title-only notification.
* **With description** -- adds body text and an icon.
* **With handlers** -- wires ``on_click`` / ``on_close`` back to Python.
* **Job started / Job finished** -- both use the same ``tag``, so the second
  *replaces* the first instead of stacking.
* **Silent** -- no sound or vibration, regardless of device settings.

``notification`` is imported and called directly: there is no hook to call and
nothing to mount in the render tree.

**Permission note**: the browser asks for permission the first time a
notification is shown. If permission is denied, or the page is not served over a
secure context (HTTPS or localhost), the message falls back to a toast.
"""

from deephaven import ui

from deephaven_plugin_notification import notification


def _basic():
    notification("Query complete")


def _detailed():
    notification(
        "Download complete",
        description="Your file is ready to view.",
        icon="https://github.com/deephaven.png",
    )


def _with_handlers():
    notification(
        "An update is available",
        description="Click to install the latest version.",
        on_click=lambda: print("Notification clicked"),
        on_close=lambda: print("Notification closed"),
    )


def _job_started():
    notification("Job started", tag="job-status")


def _job_finished():
    notification(
        "Job finished",
        description="All rows processed.",
        tag="job-status",
    )


def _silent():
    notification("Saved", silent=True)


# Every trigger the demo exposes, keyed by button label. tests/verify_examples.py
# fires each one, since it cannot press the buttons themselves.
_ACTIONS = {
    "Basic": _basic,
    "With description": _detailed,
    "With handlers": _with_handlers,
    "Job started": _job_started,
    "Job finished": _job_finished,
    "Silent": _silent,
}


@ui.component
def notification_buttons():
    return ui.flex(
        *[
            ui.button(label, on_press=lambda _e, fn=action: fn())
            for label, action in _ACTIONS.items()
        ],
        direction="column",
        gap="size-100",
        width="size-3000",
    )


notification_demo = notification_buttons()
