// Content script — extracts product data from the current page
(function () {
  function getMeta(property) {
    return (
      document.querySelector(`meta[property="${property}"]`)?.content ||
      document.querySelector(`meta[name="${property}"]`)?.content ||
      null
    );
  }

  function getJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "Product" || (item["@type"] && item["@type"].includes("Product"))) {
            return item;
          }
        }
      } catch {}
    }
    return null;
  }

  function resolvePrice(offers) {
    if (!offers) return null;
    const o = Array.isArray(offers) ? offers[0] : offers;
    if (!o) return null;
    const price = o.price ?? o.lowPrice;
    const currency = o.priceCurrency ?? "PLN";
    if (price == null) return null;
    const num = parseFloat(String(price).replace(",", "."));
    if (isNaN(num)) return null;
    const formatted = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(".", ",");
    return `${formatted} ${currency}`;
  }

  const ld = getJsonLd();

  const name =
    (ld && ld.name) ||
    getMeta("og:title") ||
    document.title ||
    "";

  const imageUrl =
    (ld && ld.image && (Array.isArray(ld.image) ? ld.image[0] : ld.image)) ||
    getMeta("og:image") ||
    null;

  const price =
    (ld && resolvePrice(ld.offers)) ||
    (() => {
      const raw = getMeta("product:price:amount") || getMeta("og:price:amount");
      const cur = getMeta("product:price:currency") || getMeta("og:price:currency") || "PLN";
      if (!raw) return null;
      const num = parseFloat(raw.replace(",", "."));
      if (isNaN(num)) return null;
      return `${num} ${cur}`;
    })() ||
    null;

  const manufacturer =
    (ld && ld.brand && (typeof ld.brand === "string" ? ld.brand : ld.brand.name)) ||
    getMeta("og:site_name") ||
    null;

  const color =
    (ld && ld.color) ||
    getMeta("product:color") ||
    null;

  const description =
    (ld && ld.description) ||
    getMeta("og:description") ||
    getMeta("description") ||
    null;

  const hostname = location.hostname;
  const supplier = hostname.startsWith("www.") ? hostname : `www.${hostname}`;

  return {
    name: (name || "").replace(/\s+/g, " ").trim(),
    url: location.href,
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    price,
    manufacturer,
    color,
    description: description ? description.slice(0, 300) : null,
    supplier,
  };
})();
