# Grouped service shortcuts

The Anke service launcher groups shortcuts into work and learning, daily life,
housing and property, and wealth. Existing hand-drawn artwork and the native
gray/white interface remain in use.

The hand-drawn plus opens a category picker. Users can add an existing Bot or
visual workspace, or create a service through the existing Create Bot page.
Bot services open the original Bot settings, including model, instructions,
capabilities, MCP authorization, secrets, memory, and automation controls.

The hand-drawn minus toggles management mode. Removing an entry only removes
its shortcut; it does not delete the Bot, conversation, credentials, or jobs.
To change an existing shortcut's category, remove it and add it in the desired
category. Names follow the corresponding Bot's current name.

`prefs.serviceShortcuts` stores `{kind, id, group}` entries through `team.prefs`.
An absent array derives the legacy services automatically; an empty array means
the user intentionally removed every shortcut. Invalid groups, missing Bot IDs,
unsupported visual IDs, and duplicate entries reject the entire update. Failed
saves use the existing preference rollback. No provider or order APIs are called
when adding or removing shortcuts.

Validation:

- `node tests/service-shortcuts-ui.cjs` mounts the real renderer in isolated
  Chromium with temporary Team storage. It checks grouping, artwork, persisted
  removal, original Bot configuration and creation, save rollback, and rejection
  of invalid configurations. It does not attach to a user's running desktop.
- `node tests/preferences-regression.cjs` covers the shared preference saver.
- Set `PI_BOT_PLAYWRIGHT_MODULE` and `PI_BOT_CHROMIUM_EXECUTABLE` to reuse the
  installed browser tooling when Playwright is outside this package.

Screenshots and machine-readable results are written under
`output/playwright/service-shortcuts/`.
