# Security Policy

## Supported Versions

The current supported version is the latest release on the default branch.

## Reporting a Vulnerability

Please report security issues privately before opening a public issue. If the GitHub repository has private vulnerability reporting enabled, use that feature. Otherwise, contact the maintainer by email after the repository owner adds a security contact.

Include:

- Firefox version
- extension version
- exact steps to reproduce
- observed impact
- whether Container isolation may be affected

## Security Notes

The extension validates Container tab creation by checking the created tab's `cookieStoreId`. If Firefox does not expose the expected value, or if the value does not match the requested Container, the extension closes the created tab and reports an error.
