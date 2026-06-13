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

## GitHub Release Automation

Pushing a version tag that starts with `v` triggers [release.yml](../.github/workflows/release.yml).

Example:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow:

- installs dependencies
- runs `npm run check`
- builds an unsigned package with `npm run build`
- or, if `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` GitHub Actions secrets are set, runs `npm run sign:unlisted` and uploads the signed `.xpi`
- publishes everything in `dist/` to the GitHub Release for that tag, including `SHA256SUMS.txt`

Required repository secrets for signed self-hosted `.xpi` releases:

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

Without those secrets, the workflow still creates a GitHub Release, but it uploads the unsigned build artifact instead of a signed `.xpi`.

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
