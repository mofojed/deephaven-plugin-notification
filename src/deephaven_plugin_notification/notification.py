from __future__ import annotations

from collections.abc import Callable
from typing import Any

# Must match the eventMapping key registered by the JS plugin
# (see src/js/src/Notification.ts).
NOTIFICATION_EVENT = "deephaven_plugin_notification.event"


class NotificationError(Exception):
    """Raised when a notification cannot be sent to the client."""


def _to_event_params(options: dict[str, Any]) -> dict[str, Any]:
    """
    Convert the snake_case keyword arguments into the camelCase payload the JS
    handler expects, dropping any option left unset.

    Args:
        options: The raw ``locals()`` of the calling function.

    Returns:
        The event payload.
    """
    params = {}
    for name, value in options.items():
        if value is None:
            continue
        head, *rest = name.split("_")
        params[head + "".join(word.capitalize() for word in rest)] = value
    return params


def notification(
    title: str,
    *,
    description: str | None = None,
    icon: str | None = None,
    tag: str | None = None,
    silent: bool | None = None,
    on_click: Callable[[], None] | None = None,
    on_close: Callable[[], None] | None = None,
) -> None:
    """
    Displays a system notification to the user using the browser's Notifications API.

    Notifications appear outside the browser window, at the operating system level, so
    they can reach the user even when the Deephaven tab is not focused. The browser must
    be served over a secure context (HTTPS or localhost) and the user must grant
    permission to display notifications. If permission is denied or notifications are not
    supported, the message is shown as a toast instead.

    Must be called from the render thread, either while a component renders or from an
    event handler it triggered. To notify from a background thread (e.g. a table
    listener), queue the call with the ``use_render_queue`` hook.

    Args:
        title: The title to display in the notification.
        description: The body text to display below the title.
        icon: The URL of an image to display as the notification's icon.
        tag: An identifying tag for the notification. Notifications with the same tag
            replace each other instead of stacking, which is useful for updating an
            existing notification.
        silent: Whether the notification should be silent (no sounds or vibrations),
            regardless of the device settings.
        on_click: Handler that is called when the user clicks the notification.
        on_close: Handler that is called when the notification is closed, either by the
            user or after a timeout.

    Returns:
        None

    Raises:
        NotificationError: If called outside of the render thread.
    """
    params = _to_event_params(locals())

    # Imported lazily so the module can be imported (and unit tested) without
    # deephaven.ui — and the engine it pulls in — being available.
    from deephaven.ui import use_send_event

    try:
        send_event = use_send_event()
    except Exception as e:
        raise NotificationError(
            "Notifications must be triggered from the render thread — while a component renders or from an event handler it triggered. To trigger from a background thread (e.g. a table listener), queue it with the `use_render_queue` hook."
        ) from e
    send_event(NOTIFICATION_EVENT, params)
