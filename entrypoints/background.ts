export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: { action: string; tabIds: number[] }, _sender, sendResponse) => {
      if (message.action === 'move-to-new-window') {
        const tabIds = message.tabIds;
        if (tabIds.length === 0) {
          sendResponse({ ok: true });
          return true;
        }

        browser.windows
          .create({ tabId: tabIds[0] })
          .then(async (newWindow) => {
            if (tabIds.length > 1 && newWindow.id !== undefined) {
              await browser.tabs.move(tabIds.slice(1), {
                windowId: newWindow.id,
                index: -1,
              });
            }
            sendResponse({ ok: true });
          })
          .catch(() => {
            sendResponse({ ok: false });
          });

        return true; // keep message channel open for async response
      }
    },
  );
});
