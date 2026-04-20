// ── Debug helper ──────────────────────────────────────────────────────────────
const DEBUG = true;
const log = (...a) => DEBUG && console.log("[veepick/bg]", ...a);

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.type === "SAVE_PENDING") {
    // Save a product to the local pending queue
    savePending(msg.product).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "FLUSH_PENDING") {
    // Try to send all pending products to the API
    flushPending(msg.appUrl, msg.apiKey).then((count) => {
      log(`Flushed ${count} pending products`);
      sendResponse({ flushed: count });
    });
    return true;
  }

  if (msg.type === "GET_PENDING") {
    chrome.storage.local.get(["pendingProducts"], ({ pendingProducts }) => {
      sendResponse({ products: pendingProducts ?? [] });
    });
    return true;
  }
});

// ── Save a product to the pending queue ───────────────────────────────────────
async function savePending(product) {
  const { pendingProducts } = await chrome.storage.local.get(["pendingProducts"]);
  const queue = pendingProducts ?? [];
  queue.push(product);
  await chrome.storage.local.set({ pendingProducts: queue });
  log("Saved pending product:", product.name);
}

// ── Flush pending products to the API ─────────────────────────────────────────
async function flushPending(appUrl, apiKey) {
  if (!appUrl || !apiKey) return 0;

  const { pendingProducts } = await chrome.storage.local.get(["pendingProducts"]);
  const queue = pendingProducts ?? [];
  if (queue.length === 0) return 0;

  const remaining = [];
  let sent = 0;

  for (const p of queue) {
    try {
      const res = await fetch(`${appUrl}/api/extension/product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          listId: p.listId,
          sectionId: p.sectionId,
          name: p.name,
          url: p.url ?? "",
          imageUrl: p.image ?? "",
          price: p.price ?? "",
          supplier: p.store ?? "",
          quantity: 1,
          description: p.comment ?? null,
          catalogNumber: p.catalogNumber ?? null,
        }),
      });

      if (res.ok) {
        log("Flushed pending product:", p.name);
        sent++;
      } else {
        remaining.push(p); // keep for next attempt
      }
    } catch {
      remaining.push(p); // network error — keep
    }
  }

  await chrome.storage.local.set({ pendingProducts: remaining });
  return sent;
}

// ── On install: show onboarding tab ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    log("Extension installed — opening setup tab");
    // Popup will handle setup; no forced tab needed, but you can uncomment:
    // chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
});

log("Background service worker started");
