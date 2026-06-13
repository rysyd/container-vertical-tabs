# AMO Submission Notes

## Listing Draft

Name:

```text
Container Vertical Tabs
```

Summary:

```text
Vertical Firefox tabs grouped by Container with collapsible sections.
```

Description:

```text
Container Vertical Tabs adds a Firefox sidebar for managing tabs vertically. Tabs are grouped by Firefox Container, and each Container group can be collapsed independently. Tabs can be reordered by dragging them inside the same Container group.

The extension includes a top-level Container picker for new tabs. When a Container tab is created, the extension verifies the created tab's cookieStoreId and closes the tab if Firefox does not confirm the expected Container assignment.

No data is sent to external servers. UI preferences are stored locally.
```

Categories:

```text
Tabs
```

Permissions explanation:

```text
tabs: list, activate, create, close, and reorder tabs in the sidebar.
storage: save collapsed Container group state locally.
contextualIdentities: read Firefox Container names, colors, and IDs.
cookies: required by Firefox for contextualIdentities access.
```

Minimum Firefox version:

```text
Firefox Desktop 140+
```

Privacy policy:

```text
This extension does not collect, transmit, sell, or share personal data. It stores only local UI preferences, such as collapsed Container groups, in browser.storage.local.
```

## Reviewer Notes

This project has no bundler, no transpiler, no minifier, and no remote code. The submitted extension is built directly from `src/` with `web-ext build`.

Before signing, replace placeholder GitHub URLs in `package.json` and `amo-metadata.json`.

Build commands:

```bash
npm ci
npm run build
```

The extension validates Container tab creation by checking the created tab's `cookieStoreId` after `tabs.create`. If it is missing or different from the requested value, the created tab is closed and an error is shown.
