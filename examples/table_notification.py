"""
Notification From A Ticking Table -- deephaven-plugin-notification
=================================================================
Raises a notification from the latest update of a ticking table.

The listener fires on the update-graph thread, but ``notification`` must run on
the render thread -- so the call is queued with ``ui.use_render_queue()``.
Calling it directly from the listener raises ``NotificationError``.

Each notification reuses the same ``tag``, so the OS replaces the previous one
rather than stacking a new alert for every tick.
"""

from deephaven import time_table, ui

from deephaven_plugin_notification import notification

_source = time_table("PT5S").update("X = i").tail(5)


@ui.component
def notification_table(t):
    render_queue = ui.use_render_queue()

    def listener_function(update, is_replay):
        added = update.added()["X"]
        if len(added) == 0:
            return
        value = added[0]
        render_queue(
            lambda: notification(
                "Table updated",
                description=f"Added X = {value}",
                tag="table-update",
            )
        )

    ui.use_table_listener(t, listener_function, [])
    return ui.table(t)


my_notification_table = notification_table(_source)
