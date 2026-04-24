// === State ===
let apiKey = "";
let baseUrl = "";
let lists = [];
let productData = {};

// === DOM helpers ===
const $ = (id) => document.getElementById(id);

function showPickedHint() {
  const hint = $("imagePickerHint");
  if (!hint) return;
  hint.textContent = "✓ Zdjęcie wybrane";
  hint.style.color = "#4f46e5";
  setTimeout(() => {
    hint.textContent = "Najedź na zdjęcie na stronie aby wybrać inne";
    hint.style.color = "";
  }, 2500);
}

function showScreen(name) {
  ["screenSetup", "screenSettings", "screenMain"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== name);
  });
  $("settingsBtn").classList.toggle("hidden", name !== "screenMain");
}

function setStatus(id, msg, type) {
  const el = $(id);
  el.textContent = msg;
  el.className = `status ${type}`;
  if (!msg) el.className = "";
}

// === API ===
async function apiFetch(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

// === Init ===
document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.local.get(["apiKey", "baseUrl"]);
  apiKey = stored.apiKey || "";
  baseUrl = stored.baseUrl || "http://localhost:3000";

  if (apiKey) {
    await initMain();
  } else {
    $("inputBaseUrl").value = baseUrl;
    showScreen("screenSetup");
  }

  // Settings button
  $("settingsBtn").addEventListener("click", () => {
    $("settingsBaseUrl").value = baseUrl;
    $("settingsApiKey").value = apiKey;
    showScreen("screenSettings");
  });
  $("btnBackFromSettings").addEventListener("click", () => showScreen("screenMain"));
  $("btnSaveSettings").addEventListener("click", saveSettings);
  $("btnDisconnect").addEventListener("click", disconnect);
  $("btnConnect").addEventListener("click", connect);
  $("btnAdd").addEventListener("click", addProduct);

  // Close button
  $("btnClose").addEventListener("click", () => {
    chrome.tabs.getCurrent((tab) => {
      if (tab) chrome.tabs.remove(tab.id);
      else window.close();
    });
  });

  // List change → populate sections
  $("selectList").addEventListener("change", () => {
    const listId = $("selectList").value;
    populateSections(listId);
    updateAddButton();
  });

  // Section change → duplicate check + enable add button
  $("selectSection").addEventListener("change", updateAddButton);
  $("fieldName").addEventListener("input", updateAddButton);
});

// === Setup / connect ===
async function connect() {
  const key = $("inputApiKey").value.trim();
  const url = $("inputBaseUrl").value.trim().replace(/\/$/, "");
  if (!key || !url) {
    setStatus("setupStatus", "Uzupełnij wszystkie pola.", "error");
    return;
  }
  setStatus("setupStatus", "Sprawdzanie...", "info");
  try {
    const res = await fetch(`${url}/api/extension/me`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error("Nieprawidłowy klucz lub adres.");
    const user = await res.json();
    await chrome.storage.local.set({ apiKey: key, baseUrl: url });
    apiKey = key;
    baseUrl = url;
    setStatus("setupStatus", `Połączono jako ${user.name || user.email}`, "success");
    setTimeout(() => initMain(), 800);
  } catch (e) {
    setStatus("setupStatus", e.message || "Błąd połączenia.", "error");
  }
}

// === Settings ===
async function saveSettings() {
  const key = $("settingsApiKey").value.trim();
  const url = $("settingsBaseUrl").value.trim().replace(/\/$/, "");
  if (!key || !url) {
    setStatus("settingsStatus", "Uzupełnij wszystkie pola.", "error");
    return;
  }
  try {
    const res = await fetch(`${url}/api/extension/me`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error("Nieprawidłowy klucz lub adres.");
    await chrome.storage.local.set({ apiKey: key, baseUrl: url });
    apiKey = key;
    baseUrl = url;
    setStatus("settingsStatus", "Zapisano.", "success");
    setTimeout(() => { setStatus("settingsStatus", "", ""); showScreen("screenMain"); initMain(); }, 800);
  } catch (e) {
    setStatus("settingsStatus", e.message || "Błąd.", "error");
  }
}

async function disconnect() {
  await chrome.storage.local.set({ apiKey: "", baseUrl: "" });
  apiKey = "";
  showScreen("screenSetup");
  $("inputBaseUrl").value = baseUrl;
}

// === Main screen init ===
async function initMain() {
  showScreen("screenMain");
  $("previewName").textContent = "Pobieranie danych...";

  // Fetch user info
  try {
    const meRes = await apiFetch("/api/extension/me");
    if (!meRes.ok) throw new Error("Sesja wygasła.");
    const me = await meRes.json();
    $("userInfo").textContent = `Zalogowany: ${me.name || me.email}`;
  } catch {
    $("userInfo").textContent = "";
  }

  // Extract product data from page and inject image picker
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      productData = results?.[0]?.result || {};

      // If user picked an image before (popup closed on page click), apply it now
      const stored = await chrome.storage.local.get("veepick_picked_image");
      if (stored.veepick_picked_image) {
        productData.imageUrl = stored.veepick_picked_image;
        chrome.storage.local.remove("veepick_picked_image");
        showPickedHint();
      }

      renderProductPreview(productData);

      // Inject image picker (non-blocking)
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["image-picker.js"],
      }).catch(() => {});
    }
  } catch {
    productData = { url: "", name: "" };
    $("previewName").textContent = "Brak danych strony";
  }

  // Fetch lists
  try {
    const dataRes = await apiFetch("/api/extension/data");
    if (!dataRes.ok) throw new Error();
    const data = await dataRes.json();
    lists = data.lists || [];
    populateLists();
    updateAddButton();
  } catch {
    setStatus("mainStatus", "Błąd pobierania list. Sprawdź połączenie.", "error");
  }
}

function renderProductPreview(p) {
  $("previewName").textContent = p.name || "Bez nazwy";
  $("previewSupplier").textContent = p.supplier || p.url || "";
  $("previewPrice").textContent = p.price || "";

  if (p.imageUrl) {
    const img = $("previewImg");
    img.src = p.imageUrl;
    img.classList.remove("hidden");
    $("previewImgPlaceholder").classList.add("hidden");
  }

  // Fill form fields
  $("fieldName").value = p.name || "";
  $("fieldPrice").value = p.price || "";
  $("fieldManufacturer").value = p.manufacturer || "";
  $("fieldColor").value = p.color || "";

  updateAddButton();
}

function populateLists() {
  const sel = $("selectList");
  sel.innerHTML = '<option value="">Wybierz listę...</option>';
  for (const list of lists) {
    const opt = document.createElement("option");
    opt.value = list.id;
    const proj = list.project?.title ? ` (${list.project.title})` : "";
    opt.textContent = list.name + proj;
    sel.appendChild(opt);
  }
}

function updateAddButton() {
  const sectionId = $("selectSection").value;
  const name = $("fieldName").value.trim();

  if (!sectionId || !name) {
    $("btnAdd").disabled = true;
    $("btnAdd").textContent = "Dodaj do listy";
    return;
  }

  const listId = $("selectList").value;
  const list = lists.find((l) => l.id === listId);
  const section = list?.sections.find((s) => s.id === sectionId);

  const warning = $("duplicateWarning");
  if (section?.products) {
    const url = productData.url?.trim();
    const isDuplicate = url
      ? section.products.some((p) => p.url === url)
      : section.products.some((p) => p.name.toLowerCase() === name.toLowerCase());

    if (isDuplicate && warning) {
      warning.textContent = `Ten produkt jest już na tej liście w sekcji „${section.name}"`;
      warning.classList.remove("hidden");
    } else if (warning) {
      warning.classList.add("hidden");
    }
  } else if (warning) {
    warning.classList.add("hidden");
  }

  $("btnAdd").disabled = false;
  $("btnAdd").textContent = "Dodaj do listy";
}

function populateSections(listId) {
  const sel = $("selectSection");
  sel.innerHTML = '<option value="">Wybierz sekcję...</option>';
  sel.disabled = !listId;
  if (!listId) return;

  const list = lists.find((l) => l.id === listId);
  if (!list) return;

  for (const section of list.sections) {
    const opt = document.createElement("option");
    opt.value = section.id;
    opt.textContent = section.unsorted ? "Poza sekcją" : section.name;
    sel.appendChild(opt);
  }
  sel.disabled = false;
}

// === Add product ===
async function addProduct() {
  const listId = $("selectList").value;
  const sectionId = $("selectSection").value;
  const name = $("fieldName").value.trim();
  const price = $("fieldPrice").value.trim();
  const quantity = parseInt($("fieldQty").value) || 1;
  const manufacturer = $("fieldManufacturer").value.trim();
  const color = $("fieldColor").value.trim();
  const dimensions = $("fieldDimensions").value.trim();
  const note = $("fieldNote").value.trim();

  if (!name || !sectionId) return;

  $("btnAdd").disabled = true;
  $("btnAdd").innerHTML = '<span class="spinner"></span> Dodawanie...';
  setStatus("mainStatus", "", "");

  try {
    const res = await apiFetch("/api/extension/product", {
      method: "POST",
      body: JSON.stringify({
        listId,
        sectionId,
        name,
        url: productData.url || null,
        imageUrl: productData.imageUrl || null,
        price: price || null,
        manufacturer: manufacturer || null,
        color: color || null,
        dimensions: dimensions || null,
        note: note || null,
        supplier: productData.supplier || null,
        description: productData.description || null,
        quantity,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Błąd serwera");
    }

    // Update local section products so duplicate check works immediately
    const addedList = lists.find((l) => l.id === listId);
    const addedSection = addedList?.sections.find((s) => s.id === sectionId);
    if (addedSection?.products) {
      addedSection.products.push({ url: productData.url?.trim() || null, name });
    }

    setStatus("mainStatus", "✓ Produkt dodany do listy!", "success");
    updateAddButton();

    // Remove image picker from page and close popup after brief delay
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            document.getElementById("veepick-picker")?.remove();
            document.getElementById("veepick-picker-styles")?.remove();
          },
        }).catch(() => {});
      }
    } catch {}
    setTimeout(() => window.close(), 1200);
  } catch (e) {
    setStatus("mainStatus", e.message || "Błąd dodawania.", "error");
    updateAddButton();
  }
}
