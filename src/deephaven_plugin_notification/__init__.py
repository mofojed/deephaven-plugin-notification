"""
Display OS-level system notifications from a deephaven.ui render tree.

The public API is the :func:`notification` function. Every call sends a single
``deephaven_plugin_notification.event`` to the client, which shows it with the
browser's Notifications API (falling back to a toast when that is unavailable).
"""

from .notification import NotificationError, notification

__all__ = [
    "notification",
    "NotificationError",
]
