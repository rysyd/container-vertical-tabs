# Privacy Policy

Container Vertical Tabs does not collect, transmit, sell, or share personal data.

The extension reads tab metadata available through Firefox extension APIs so it can render the sidebar:

- tab title
- tab URL
- favicon URL
- active, pinned, audible, muted, and discarded state
- tab `cookieStoreId`
- Firefox Container names and colors

This data is used only inside the local sidebar UI.

The extension stores only local UI preferences in `browser.storage.local`, currently the collapsed or expanded state of Container groups.

The extension manifest declares Mozilla's no-data-collection permission with `data_collection_permissions.required=["none"]`.

The extension does not:

- send data to external servers
- inject remote scripts
- use analytics
- read website cookies directly
- move cookies or site data between Containers
