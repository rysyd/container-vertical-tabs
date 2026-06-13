# Contributing

Thanks for improving Container Vertical Tabs.

## Local Setup

```bash
npm install
npm run check
npm run run
```

## Pull Requests

Before opening a pull request:

- Keep the extension dependency-free unless there is a strong reason.
- Do not add remote code, tracking, analytics, or minification.
- Run `npm run check`.
- Test Container tab creation for `No Container` and at least one real Container.
- Update `CHANGELOG.md` for user-visible changes.

## Code Style

- Use plain JavaScript, HTML, and CSS.
- Keep logic close to the sidebar unless it must run in the background script.
- Prefer explicit validation for Container-sensitive behavior.
