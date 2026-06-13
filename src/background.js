browser.browserAction.onClicked.addListener(async () => {
  try {
    await browser.sidebarAction.open();
  } catch (error) {
    console.error("Unable to open Container Tabs sidebar", error);
  }
});
