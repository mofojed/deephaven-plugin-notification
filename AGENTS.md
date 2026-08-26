# Developing deephaven_plugin_notification

Contributor guide: project layout, and how to build, run, test, and lint. For what the plugin
_does_ and how to _use_ it, see [README.md](./README.md) and
[SKILL.md](./skills/deephaven-plugin-notification/SKILL.md).

## Run / dev loop

One command builds the JS, (re)installs the wheel, and starts a Deephaven server with the repo
mounted as the data directory (PSK `iris`):

```sh
uv sync && uv run plugin_builder.py --dev
```

`--dev` is sugar for `--reinstall --js --server`. Useful variations:

| Command                                                   | When                                     |
| --------------------------------------------------------- | ---------------------------------------- |
| `uv run plugin_builder.py --reinstall --js`               | rebuild JS + reinstall (no version bump) |
| `uv run plugin_builder.py --reinstall`                    | Python-only change (skip JS build)       |
| `uv run plugin_builder.py --dev --watch`                  | rebuild + restart on file changes        |
| `uv run plugin_builder.py --dev --server-arg --port=9999` | pass args through to the server          |

`--data-dir <path>` mounts a different directory as the Deephaven data dir (default: repo root, so
`storage/notebooks` shows up in the Web IDE). `storage/` is git-ignored and regenerated from
`examples/` on each server launch — **edit `examples/`, not `storage/`**.

## Project layout

```
src/deephaven_plugin_notification/  Python package
  __init__.py                       public API: exports `notification`, `NotificationError`
  notification.py                   the trigger API: `notification(...)` builds the camelCase
                                    payload and sends one
                                    `deephaven_plugin_notification.event` via `use_send_event`.
                                    Also owns the `NOTIFICATION_EVENT` constant.
  register.py                       registers the bundled JS with Deephaven
  _js/dist/index.js                 built JS bundle (git-ignored; produced by setup.py)

src/js/src/                         TypeScript source
  index.ts                          plugin entry point
  DeephavenPluginNotificationPlugin.ts
                                    registration: no element `mapping`, one `eventMapping`
                                    entry whose key must match `NOTIFICATION_EVENT` in
                                    notification.py
  Notification.ts                   `showNotification`: permission flow, the Notifications API
                                    call, and the ToastQueue fallback

plugin_builder.py                   build/install/run CLI (uv build + uv pip install + server)
setup.py                            packages src/js/dist into the wheel via package_js()
examples/                           runnable panels (canonical; copied into storage/notebooks)
tests/                              see Testing below
```

The Python side never loads the JS. Every trigger sends one JSON event and the JS handler shows
it; nothing persists on the client between events. Keep that payload contract in sync between
`notification.py` (producer) and `Notification.ts`'s `NotificationParams` (consumer) — the Python
side converts `snake_case` kwargs to `camelCase` keys and drops any left as `None`.

### Externals contract

`src/js/vite.config.js` marks every `@deephaven/*` import as `external`, so the bundle `require`s
them from the host at load time. This is **required** for `@deephaven/components`: the toast
fallback calls `ToastQueue`, a module-level singleton the app's `ToastContainer` renders from — a
bundled copy would be a second, unrendered queue and the fallback would silently do nothing.
`tests/loader/simulate-dh-loader.mjs` guards this: it fails if the bundle requires anything the
host does not provide, and asserts the fallback reaches the host-provided `ToastQueue`.

## Environment

Managed with [uv](https://docs.astral.sh/uv/); all deps + dev tooling are in `pyproject.toml`.
`uv sync` creates `.venv` with the runtime deps and the dev group (`ruff`, `ty`, `pytest`,
`deephaven-server`, `watchdog`). This is a uv _virtual_ project (`[tool.uv] package = false`), so
`uv sync` does not build the wheel — `plugin_builder.py` does.

JS deps install automatically on the first `--js` build.

## Testing

```sh
# Python unit tests — the event payload, camelCase conversion and the
# off-render-thread error. deephaven.ui is stubbed, so no server is needed.
uv run pytest -q

# Every examples/*.py, exec'd + rendered against a REAL in-process Deephaven
# server, with its triggers fired and a live ticking-table listener checked
# end to end
.venv/bin/python tests/verify_examples.py

# The bundle, loaded exactly as the Deephaven web client loads it (pure Node).
# Also checks the externals contract and the ToastQueue fallback.
node tests/loader/simulate-dh-loader.mjs

# Browser tests of the built bundle (tier1, must pass)
cd tests/e2e && npm test
```

`verify_examples.py` boots a real server and drives the actual `deephaven.ui` Renderer inside an
`EventContext` (the way `ElementMessageStream` does), so it catches contract drift the stubbed unit
tests can't. Its render queue runs queued work with the `EventContext` open, matching the real
render thread — that is what lets a `notification` queued from a table listener reach `send_event`.

The e2e harness loads the built bundle through `new Function(module, exports, require, …)` and
delivers payloads to the plugin's own `eventMapping` handler, so tier1 exercises the real event
path. It replaces the browser's `Notification` API with a controllable mock so the permission
branches are deterministic and no real OS notification fires. Rebuild the bundle
(`cd src/js && npm run build`) before running it.

## Lint, format, type-check

```sh
uv run ruff check .      # lint
uv run ruff format .     # format
uv run ty check src      # type check
```

JS: `cd src/js && node_modules/.bin/tsc --noEmit` (typecheck) and `npm run build` (bundle).

## Distributing

Bump the version in `pyproject.toml`, build (`uv run plugin_builder.py --reinstall --js` or
`uv build --wheel`), then upload the wheel from `dist/`. Publishing to PyPI happens automatically
on GitHub release via `.github/workflows/publish.yml`.

## Debugging

- **Import not found / nothing happens** → the plugin isn't registered. Check the console for
  `Plugins loaded:` including this plugin, or the settings panel (gear icon). Rebuild/reinstall and
  watch for errors. Confirm the Python package: `uv pip list | grep notification`.
- **A toast appears instead of a notification** → that is the documented fallback. Either the user
  denied permission, or the page is not a secure context (HTTPS or `localhost`). Check
  `Notification.permission` in the browser console.
- **`NotificationError: Notifications must be triggered from the render thread`** → the call
  happened on a background thread (a table listener, a worker). Wrap it in `ui.use_render_queue()`.
