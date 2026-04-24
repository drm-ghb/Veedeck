// Veepick image picker — injected when popup opens
(function () {
  // Idempotent: clean up previous instance
  document.getElementById("veepick-picker")?.remove();
  document.getElementById("veepick-picker-styles")?.remove();

  const style = document.createElement("style");
  style.id = "veepick-picker-styles";
  style.textContent = `
    #veepick-picker {
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #veepick-picker.vp-visible {
      opacity: 1;
      pointer-events: all;
    }
    #veepick-picker-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: opacity 0.12s, transform 0.12s;
    }
    #veepick-picker-btn:hover {
      opacity: 0.95;
      transform: scale(1.08);
    }
    #veepick-picker-btn.vp-picked svg {
      stroke: #4F46E5 !important;
    }
    #veepick-picker-btn svg {
      width: 52px;
      height: 52px;
      stroke: #ffffff;
      fill: none;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.55));
    }
  `;
  document.head.appendChild(style);

  const iconSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
    <line x1="16" y1="5" x2="16" y2="11"/>
    <line x1="13" y1="8" x2="19" y2="8"/>
  </svg>`;

  const picker = document.createElement("div");
  picker.id = "veepick-picker";

  const btn = document.createElement("button");
  btn.id = "veepick-picker-btn";
  btn.title = "Użyj tego zdjęcia w Veepick";
  btn.innerHTML = iconSvg;
  picker.appendChild(btn);
  document.body.appendChild(picker);

  let currentImg = null;
  let currentSrc = null;
  let hideTimer = null;

  function isPickable(img) {
    const rect = img.getBoundingClientRect();
    return (
      rect.width >= 80 &&
      rect.height >= 80 &&
      img.src &&
      !img.src.startsWith("data:") &&
      img.src.startsWith("http")
    );
  }

  function updatePickerPosition() {
    if (!currentImg) return;
    const rect = currentImg.getBoundingClientRect();

    // Hide if image has scrolled out of viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
      picker.classList.remove("vp-visible");
      return;
    }

    picker.style.top = rect.top + "px";
    picker.style.left = rect.left + "px";
    picker.style.width = rect.width + "px";
    picker.style.height = rect.height + "px";
  }

  function showPicker(img) {
    currentImg = img;
    currentSrc = img.src;
    clearTimeout(hideTimer);
    updatePickerPosition();
    picker.classList.add("vp-visible");
  }

  function hidePicker() {
    hideTimer = setTimeout(() => {
      picker.classList.remove("vp-visible");
      currentImg = null;
      currentSrc = null;
    }, 180);
  }

  // Update position on any scroll (capture phase catches nested scrollable containers)
  window.addEventListener("scroll", updatePickerPosition, true);

  document.addEventListener("mouseover", (e) => {
    const img = e.target.closest("img");
    if (!img || !isPickable(img)) return;
    showPicker(img);
  }, true);

  document.addEventListener("mouseout", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    if (!e.relatedTarget || !e.relatedTarget.closest("#veepick-picker")) {
      hidePicker();
    }
  }, true);

  picker.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  picker.addEventListener("mouseleave", hidePicker);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentSrc) return;

    try {
      chrome.runtime.sendMessage({ type: "veepick-image-pick", url: currentSrc });
      btn.classList.add("vp-picked");
      setTimeout(() => btn.classList.remove("vp-picked"), 900);
    } catch {
      // Extension context invalidated — clean up stale picker
      picker.remove();
      style.remove();
    }
  });
})();
