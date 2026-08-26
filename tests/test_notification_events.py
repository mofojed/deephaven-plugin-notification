"""
Unit tests for the event payload built by ``notification``.

Nothing here needs a Deephaven server: ``notification`` only reaches for
``deephaven.ui`` when it fires, which the fake event context below intercepts.
"""

from __future__ import annotations

import sys
import types

import pytest

from deephaven_plugin_notification import NotificationError, notification
from deephaven_plugin_notification.notification import NOTIFICATION_EVENT

# ---------------------------------------------------------------------------
# Fake event context: `notification` calls `use_send_event()` from deephaven.ui
# at trigger time, so a stub module is enough to capture the payloads.
# ---------------------------------------------------------------------------


@pytest.fixture
def sent(monkeypatch):
    """Capture every (name, payload) that a `notification` call sends."""
    captured: list[tuple[str, dict]] = []

    ui = types.ModuleType("deephaven.ui")
    ui.use_send_event = lambda: lambda name, params: captured.append((name, params))
    monkeypatch.setitem(sys.modules, "deephaven.ui", ui)
    return captured


@pytest.fixture
def no_context(monkeypatch):
    """A deephaven.ui whose use_send_event raises, as it does off-render."""
    ui = types.ModuleType("deephaven.ui")

    def _boom():
        raise RuntimeError("No context set")

    ui.use_send_event = _boom
    monkeypatch.setitem(sys.modules, "deephaven.ui", ui)


def test_sends_notification_event(sent):
    notification("Hello")

    assert len(sent) == 1
    name, payload = sent[0]
    assert name == NOTIFICATION_EVENT
    assert payload["title"] == "Hello"
    # None-valued options should be removed
    assert "description" not in payload
    assert "icon" not in payload
    assert "onClick" not in payload


def test_converts_options_to_camel_case(sent):
    def on_click():
        pass

    def on_close():
        pass

    notification(
        "Title",
        description="Body text",
        icon="https://example.com/icon.png",
        tag="my-tag",
        silent=True,
        on_click=on_click,
        on_close=on_close,
    )

    assert len(sent) == 1
    name, payload = sent[0]
    assert name == NOTIFICATION_EVENT
    assert payload == {
        "title": "Title",
        "description": "Body text",
        "icon": "https://example.com/icon.png",
        "tag": "my-tag",
        "silent": True,
        "onClick": on_click,
        "onClose": on_close,
    }


def test_keeps_falsy_values(sent):
    """Only `None` means "unset" — `False` is a meaningful value for `silent`."""
    notification("Title", silent=False, description="")

    _name, payload = sent[0]
    assert payload["silent"] is False
    assert payload["description"] == ""


def test_raises_outside_render_thread(no_context):
    with pytest.raises(NotificationError):
        notification("Hello")
