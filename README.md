# deephaven-plugin-notification

Display OS-level system notifications from [deephaven.ui](https://github.com/deephaven/deephaven-plugins/tree/main/plugins/ui) using the browser's [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API).

Unlike toasts, notifications appear _outside_ the browser window, so they can reach the user even when the Deephaven tab is not focused.

## Install

```sh
pip install deephaven-plugin-notification
```

Restart the Deephaven server so the plugin is registered.

## Usage

```python
from deephaven import ui

from deephaven_plugin_notification import notification

btn = ui.button(
    "Show notification",
    on_press=lambda _e: notification("Query complete"),
    variant="primary",
)
```

`notification` is called directly — there is no hook to call and nothing to mount in the render tree.

### Where you can call it

`notification` must run on the **render thread**: while a `@ui.component` renders, or from an event handler it triggered (like the `on_press` above). Calling it from the top level of a script or console, or from a background thread such as a table listener, raises `NotificationError`.

That is why every example below wraps the call in a handler or a component. To notify from a table listener, queue it with `ui.use_render_queue()` — see [Notifying from a ticking table](#notifying-from-a-ticking-table).

### Permissions

Notifications require the user to grant permission before they can be displayed. The first time `notification` is called, the browser prompts the user to allow them. If the user denies permission, or notifications are not supported (for example, when the page is not served over a secure context such as HTTPS or `localhost`), the message is shown as a toast instead.

### Content

The `title` is required. An optional `description` provides body text below the title, and `icon` may be a URL to an image.

```python
from deephaven import ui

from deephaven_plugin_notification import notification

btn = ui.button(
    "Download",
    on_press=lambda _e: notification(
        "Download complete",
        description="Your file is ready to view.",
        icon="https://github.com/deephaven.png",
    ),
    variant="primary",
)
```

### Events

`on_click` is called when the user clicks the notification, and `on_close` when it is dismissed. When the call falls back to a toast, `on_click` is exposed as an action button on the toast so the callback remains reachable.

```python
from deephaven import ui

from deephaven_plugin_notification import notification

btn = ui.button(
    "Check for updates",
    on_press=lambda _e: notification(
        "An update is available",
        description="Click to install the latest version.",
        on_click=lambda: print("Clicked!"),
        on_close=lambda: print("Closed"),
    ),
    variant="primary",
)
```

### Replacing notifications

Use `tag` to group related notifications. A new notification with the same `tag` replaces the existing one instead of stacking, which is useful for status or progress updates.

```python
from deephaven import ui

from deephaven_plugin_notification import notification


@ui.component
def status_updater():
    def notify(message):
        notification(message, tag="job-status")

    return ui.button_group(
        ui.button("Start", on_press=lambda _e: notify("Job started")),
        ui.button("Finish", on_press=lambda _e: notify("Job finished")),
    )


my_status_updater = status_updater()
```

### Silent notifications

Set `silent=True` to display a notification without any sound or vibration, regardless of the device's settings.

```python
from deephaven import ui

from deephaven_plugin_notification import notification

btn = ui.button(
    "Save",
    on_press=lambda _e: notification("Saved", silent=True),
    variant="primary",
)
```

### Notifying from a ticking table

A table listener fires on the update-graph thread, not the render thread, so the call must be queued with `ui.use_render_queue()`. Calling `notification` straight from the listener raises `NotificationError`.

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

## API

### `notification(title, *, description=None, icon=None, tag=None, silent=None, on_click=None, on_close=None)`

| Argument      | Type       | Description                                                                    |
| ------------- | ---------- | ------------------------------------------------------------------------------ |
| `title`       | `str`      | The title to display in the notification.                                      |
| `description` | `str`      | Body text to display below the title.                                          |
| `icon`        | `str`      | URL of an image to display as the notification's icon.                         |
| `tag`         | `str`      | Notifications sharing a tag replace each other instead of stacking.            |
| `silent`      | `bool`     | Display without sound or vibration, regardless of device settings.             |
| `on_click`    | `Callable` | Called when the user clicks the notification.                                  |
| `on_close`    | `Callable` | Called when the notification is closed, either by the user or after a timeout. |

Raises `NotificationError` if called off the render thread. Returns `None` — a notification is fire-and-forget, there is no handle to dismiss it from Python.

## Examples

Runnable panels live in [`examples/`](./examples). They are copied into the Web IDE's notebook list when the dev server is launched — see [AGENTS.md](./AGENTS.md).

## Contributing

See [AGENTS.md](./AGENTS.md) for the project layout and the build/run/test/lint loop.

## License

[Apache-2.0](./LICENSE)
