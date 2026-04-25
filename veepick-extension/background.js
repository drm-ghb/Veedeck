chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["offlineQueue"], (data) => {
    if (!data.offlineQueue) chrome.storage.local.set({ offlineQueue: [] });
  });
});

// Toggle panel in the active tab on icon click
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["panel.js"] }).catch(() => {});
});

// Handle messages from panel.js content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Relay image pick to storage
  if (msg.type === "veepick-image-pick" && msg.url) {
    chrome.storage.local.set({ veepick_picked_image: msg.url });
    return;
  }

  // Proxy API fetch (content scripts may have CORS issues)
  if (msg.type === "api-fetch") {
    fetch(msg.url, msg.options)
      .then(async (res) => {
        const text = await res.text();
        sendResponse({ ok: res.ok, status: res.status, text });
      })
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }

  // Inject image picker into the sender tab
  if (msg.type === "inject-image-picker" && sender.tab?.id) {
    chrome.scripting.executeScript({ target: { tabId: sender.tab.id }, files: ["image-picker.js"] }).catch(() => {});
  }
});
