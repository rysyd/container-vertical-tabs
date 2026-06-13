# Release Checklist

## Before Release

1. Update `src/manifest.json` version.
2. Update `package.json` version.
3. Update `CHANGELOG.md`.
4. Replace placeholder GitHub URLs in `package.json`, `amo-metadata.json`, and `README.md`.
5. Run checks:

```bash
npm ci
npm run check
```

6. Test in Firefox:

```bash
npm run run
```

7. Manually verify:

- sidebar opens
- tabs render in the current window
- groups follow Firefox Container identity
- Container groups collapse and persist after sidebar reload
- `No Container` top-level new tab creates `cookieStoreId=firefox-default`
- selected Container top-level new tab creates the selected `cookieStoreId`
- per-group `+` creates the correct `cookieStoreId`
- tabs can be reordered by dragging them inside the same Container group
- tab close, middle-click close, activation, and filtering work

## Build

```bash
npm run build
```

Upload the generated package from `dist/` to GitHub Releases or AMO.

## AMO Listed Signing

Set credentials from the AMO Developer Hub:

```bash
export AMO_JWT_ISSUER="user:..."
export AMO_JWT_SECRET="..."
npm run sign:listed
```

## Source Package for Review

If AMO asks for source, submit the repository source with:

- `README.md`
- `package.json`
- `package-lock.json`
- `src/`
- `docs/`

Reviewer build instructions:

```bash
npm ci
npm run build
```
