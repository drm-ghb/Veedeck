// ── Debug helper ──────────────────────────────────────────────────────────────
const DEBUG = true;
const log = (...a) => DEBUG && console.log("[veepick/content]", ...a);

// ── Store selectors map ───────────────────────────────────────────────────────
// Each entry: { name, title: [...selectors], price: [...], image: [...], sku: [...] }
const STORES = {
  "ikea.com": {
    name: "IKEA",
    title: ["h1[class*='pip-header-section__title']", "h1.product-name", "h1"],
    price: ["span[class*='pip-temp-price__integer']", "[class*='pip-price-package__main-price']", ".pip-temp-price"],
    image: [".pip-aspect-ratio-image__image img", "[class*='pip-media-grid'] img", "[class*='pip-image'] img"],
    sku: ["span[class*='pip-product-identifier__value']"],
  },
  "sklum.com": {
    name: "Sklum",
    title: ["h1.product-name", "h1[class*='product']", "h1"],
    price: [".price-now", ".product-price span", "[class*='price']"],
    image: [".product-zoom img", ".main-image img", ".product-gallery img"],
    sku: [".sku", "[class*='reference']"],
  },
  "bocco.pl": {
    name: "Bocco",
    title: ["h1.product_title", "h1[class*='product']", "h1"],
    price: [".woocommerce-Price-amount", ".price .amount", ".price"],
    image: [".woocommerce-product-gallery__image img", ".product-image img"],
    sku: [".sku", "[itemprop='sku']"],
  },
  "homla.pl": {
    name: "Homla",
    title: ["h1.product-name", "[class*='product-title']", "h1"],
    price: [".price-final .price", ".price-final", "[class*='final-price']", ".price"],
    image: [".product-image-photo", ".gallery-image", ".swiper-slide img"],
    sku: [".product-info-stock-sku .value"],
  },
  "westwing.pl": {
    name: "Westwing",
    title: ["h1[class*='product-name']", "[data-testid='product-name']", "h1"],
    price: ["[data-testid='product-price']", "[class*='Price']", "[class*='price']"],
    image: ["[class*='ProductGallery'] img", "[class*='gallery'] img"],
    sku: ["[class*='sku']", "[data-testid='sku']"],
  },
  "allegro.pl": {
    name: "Allegro",
    title: ["[data-box-name='Hero'] h1", "h1[class*='ms']", "h1"],
    price: ["[class*='price__value']", "[data-role='price']", "[class*='price'] strong"],
    image: ["[class*='gallery'] img", "[data-testid*='gallery'] img", ".photo img"],
    sku: [],
  },
  "amazon.pl": {
    name: "Amazon",
    title: ["#productTitle", "h1"],
    price: [".a-price-whole", "#priceblock_ourprice", ".a-price .a-offscreen"],
    image: ["#landingImage", "#imgBlkFront", "#main-image-container img"],
    sku: ["#ASIN"],
  },
  "castorama.pl": {
    name: "Castorama",
    title: ["h1[class*='ProductTitle']", "h1"],
    price: ["[class*='Price__main']", "[class*='price']"],
    image: ["[class*='ProductGallery'] img", ".slick-active img"],
    sku: ["[class*='ProductCode']"],
  },
  "leroy-merlin.pl": {
    name: "Leroy Merlin",
    title: ["h1[class*='product-name']", "h1"],
    price: ["[class*='product-price__main']", "[class*='price']"],
    image: ["[class*='Gallery'] img", ".product-gallery img"],
    sku: ["[class*='product-code']"],
  },
};

// ── OG metadata fallback ──────────────────────────────────────────────────────
function getOGData() {
  const get = (prop) => document.querySelector(`meta[property="${prop}"]`)?.content
    ?? document.querySelector(`meta[name="${prop}"]`)?.content ?? null;
  return {
    title: get("og:title"),
    image: get("og:image"),
    description: get("og:description"),
  };
}

// ── Query first matching selector from a list ─────────────────────────────────
function queryFirst(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch { /* ignore invalid selectors */ }
  }
  return null;
}

// ── Get store config for current hostname ─────────────────────────────────────
function getStoreConfig() {
  const host = window.location.hostname.replace(/^www\./, "");
  for (const [domain, config] of Object.entries(STORES)) {
    if (host === domain || host.endsWith("." + domain)) return config;
  }
  return null;
}

// ── Extract product data from page ───────────────────────────────────────────
function extractProduct() {
  const store = getStoreConfig();
  const og = getOGData();

  let name = null, price = null, image = null, sku = null;

  if (store) {
    name  = queryFirst(store.title)?.textContent?.trim() ?? null;
    price = queryFirst(store.price)?.textContent?.trim() ?? null;
    image = queryFirst(store.image)?.src
         ?? queryFirst(store.image)?.getAttribute("data-src")
         ?? null;
    sku   = queryFirst(store.sku)?.textContent?.trim() ?? null;
  }

  // OG fallbacks
  name  = name  || og.title  || document.title || null;
  image = image || og.image  || null;

  // Clean up price — strip extra whitespace/newlines
  if (price) price = price.replace(/\s+/g, " ").trim();

  log("Extracted:", { name, price, image, store: store?.name });

  if (!name) return null;

  return {
    name,
    price: price ?? null,
    image: image ?? null,
    url: window.location.href,
    store: store?.name ?? new URL(window.location.href).hostname.replace(/^www\./, ""),
    catalogNumber: sku ?? null,
  };
}

// ── Listen for messages from popup ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "EXTRACT_PRODUCT") {
    const product = extractProduct();
    log("Responding with product:", product);
    sendResponse({ product });
    return true; // keep channel open for async
  }
});

log("Content script ready on", window.location.hostname);
