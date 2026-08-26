---
name: deephaven-plugin-notification
description: >-
  Show OS-level system notifications from a Deephaven Web IDE panel
  (@ui.component). Notifications appear outside the browser window, so they
  reach the user even when the Deephaven tab is not focused. Exposes one Python
  entry point — notification(title, ...) — which you call directly. Use this
  skill whenever the user is building a deephaven.ui / @ui.component panel and
  mentions system notifications, desktop notifications, OS alerts, browser
  notifications, alerting the user when a job/query finishes, or notifying from
  a ticking table — even if they never name the plugin. Also use it whenever
  editing code that imports deephaven_plugin_notification or calls
  notification(...).
---

# deephaven-plugin-notification

Displays a system notification using the browser's Notifications API. There is no hook to call and
nothing to mount — import `notification` and call it.

```python
from deephaven import ui

from deephaven_plugin_notification import notification

btn = ui.button(
    "Run query",
    on_press=lambda _e: notification("Query complete"),
    variant="primary",
)
```

## Options

All are keyword-only; `title` is the single positional argument.

| Option        | Type       | Notes                                                              |
| ------------- | ---------- | ------------------------------------------------------------------ |
| `description` | `str`      | Body text below the title.                                         |
| `icon`        | `str`      | URL of an image.                                                   |
| `tag`         | `str`      | Same tag ⇒ replaces the previous notification instead of stacking. |
| `silent`      | `bool`     | No sound or vibration.                                             |
| `on_click`    | `Callable` | Zero-arg callable, runs when the notification is clicked.          |
| `on_close`    | `Callable` | Zero-arg callable, runs when it is dismissed.                      |

## Rules

- **Must run on the render thread** — during a render or in an event handler it triggered. From a
  table listener or any background thread, queue it with `ui.use_render_queue()`, otherwise it
  raises `NotificationError`.
- **Permission is required.** The browser prompts on first use. If permission is denied, or the page
  is not a secure context (HTTPS or `localhost`), the message falls back to a toast automatically —
  no extra handling needed. `on_click` becomes the toast's action button.
- Use `tag` for repeated status updates so the user isn't buried in alerts.

## Notifying from a ticking table

```python
from deephaven import time_table, ui

from deephaven_plugin_notification import notification

_source = time_table("PT5S").update("X = i").tail(5)


@ui.component
def notification_table(t):
    render_queue = ui.use_render_queue()

    def listener_function(update, is_replay):
        data_added = update.added()["X"][0]
        render_queue(lambda: notification(f"Added {data_added}", tag="table-update"))

    ui.use_table_listener(t, listener_function, [])
    return ui.table(t)


my_notification_table = notification_table(_source)
```

See [README.md](../../README.md) for the full API and more examples.
