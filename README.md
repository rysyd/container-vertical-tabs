# Container Vertical Tabs

Container Vertical Tabs is a Firefox extension that replaces tab scanning with a sidebar-first workflow. It lists tabs vertically, groups them by Firefox Container, and lets each Container group collapse independently.

The project is intentionally simple for AMO review: no bundler, no minifier, no remote code, and no build-time source transformation. The package submitted to Firefox is generated directly from `src/`.

## Features

- Shows tabs from the current Firefox window in a vertical sidebar.
- Groups tabs by Firefox Container.
- Collapses and expands each Container group, with state saved locally.
- Reorders tabs by dragging them inside the same Container group.
- Shows Firefox split view tabs as a merged unit inside their Container group.
- Creates a new tab without a Container or in a selected Container.
- Verifies every Container tab creation by checking the created tab's `cookieStoreId`.
- Closes an unverified tab immediately if Container assignment cannot be proven.
- Activates tabs, closes tabs, supports middle-click close, and filters tabs by title or URL.

## Requirements

- Firefox Desktop 140 or newer.
- Node.js 24 or newer.
- npm 11 or newer.

The Node and npm versions match Mozilla's documented reviewer build environment as of this project setup.

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run check
```

Launch a temporary Firefox profile with the extension loaded:

```bash
npm run run
```

Build an unsigned package:

```bash
npm run build
```

The generated package is written to `dist/`.

## Temporary Manual Install

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `src/manifest.json`.
4. Open the sidebar from the Firefox sidebar picker or click the extension toolbar button.

## Strict Container Validation

Container isolation matters. When creating a tab in a Container, the extension:

1. Confirms the requested Container still exists through `browser.contextualIdentities.get`.
2. Creates the tab with `tabs.create({ cookieStoreId })`.
3. Reads the created tab back with `tabs.get`.
4. Compares the actual `cookieStoreId` with the requested one.
5. Closes the created tab and reports an error if the value is missing or mismatched.

The extension validates Firefox's extension-layer Container identity. It does not inspect website cookies or transfer data between Containers.

## Hide Firefox's Native Top Tab Bar

WebExtensions cannot hide Firefox's built-in horizontal tab strip. Use `userChrome.css` for that part. See [docs/userChrome.css](docs/userChrome.css).

## Publish

GitHub and AMO release notes live in [docs/RELEASE.md](docs/RELEASE.md) and [docs/AMO_SUBMISSION.md](docs/AMO_SUBMISSION.md).

Push a `v*` tag to let GitHub Actions build and publish the release assets automatically:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Configure `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` as repository secrets so the release workflow uploads a signed unlisted `.xpi`. The workflow fails without those secrets to avoid publishing unsigned release artifacts.

For listed AMO signing:

```bash
WEB_EXT_API_KEY="user:..." WEB_EXT_API_SECRET="..." npm run sign:listed
```

For self-distributed signing:

```bash
WEB_EXT_API_KEY="user:..." WEB_EXT_API_SECRET="..." npm run sign:unlisted
```

## Privacy

This extension does not collect, transmit, sell, or share personal data. It stores only local UI preferences, such as collapsed Container groups, in `browser.storage.local`. See [PRIVACY.md](PRIVACY.md).

The manifest explicitly declares Mozilla's no-data-collection permission with `data_collection_permissions.required=["none"]`.

## License

MIT
