/* ============================================================
   Bhaktinandan Behera — Profile Website
   Avatar (AI / photo) logic
   ============================================================ */

(function () {
  "use strict";

  // ---------- Settings ----------
  const STORAGE_KEY = "bhaktinandan-profile-picture";
  const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

  // AI avatar styles to offer (DiceBear styles)
  const AVATAR_STYLES = [
    { id: "adventurer",     label: "Adventurer",     bg: "b6e3f4" },
    { id: "lorelei",        label: "Lorelei",        bg: "ffd5dc" },
    { id: "micah",          label: "Micah",          bg: "c0aede" },
    { id: "notionists",     label: "Notionists",     bg: "dee1ff" },
    { id: "open-peeps",     label: "Open Peeps",     bg: "fbe09e" },
    { id: "fun-emoji",      label: "Fun Emoji",      bg: "ffdfbf" },
    { id: "pixel-art",      label: "Pixel Art",      bg: "b8e3ff" },
    { id: "big-smile",      label: "Big Smile",      bg: "ffe1cc" },
    { id: "avataaars",      label: "Avataaars",      bg: "f1f4dc" },
    { id: "bottts",         label: "Bottts",         bg: "d1f4d9" },
  ];

  const DEFAULT_STYLE = "adventurer";
  const DEFAULT_SEED = "Bhaktinandan Behera";
  const seedWords = ["Bhakti", "Artist", "Paints", "Geometry", "Sketch", "Canvas", "Rainbow", "Maths", "Palette", "Sunshine"];

  // ---------- State ----------
  let currentStyle = DEFAULT_STYLE;
  let currentSeed = DEFAULT_SEED;
  let currentPicture = null; // { type: "avatar" | "photo", value: ... }

  // ---------- DOM refs ----------
  const profileAvatar = document.getElementById("profile-avatar");
  const avatarPreview = document.getElementById("avatar-preview");
  const avatarStylesEl = document.getElementById("avatar-styles");
  const avatarModal = document.getElementById("avatar-modal");
  const photoInput = document.getElementById("photo-input");
  const toastEl = document.getElementById("toast");
  const applyAvatarBtn = document.getElementById("apply-avatar-btn");
  const shuffleBtn = document.getElementById("shuffle-btn");

  // ---------- Helpers ----------
  function avatarUrl(style, seed) {
    const styleCfg = AVATAR_STYLES.find((s) => s.id === style) || AVATAR_STYLES[0];
    return (
      DICEBEAR_BASE +
      "/" +
      style +
      "/svg?seed=" +
      encodeURIComponent(seed) +
      "&backgroundColor=" +
      styleCfg.bg +
      "&backgroundType=solid,gradientLinear"
    );
  }

  function showToast(message, duration) {
    toastEl.textContent = message;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add("hidden"), duration || 2600);
  }

  // ---------- Applying pictures ----------
  function applyPicture(picture) {
    currentPicture = picture;
    profileAvatar.src = picture.value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picture));
    } catch (e) {
      // Storage might be full or unavailable — show a friendly message
      showToast("Could not save the picture on this device, but it is showing now.");
    }
  }

  function setAvatar(style, seed) {
    currentStyle = style;
    currentSeed = seed;
    const url = avatarUrl(style, seed);
    if (avatarPreview) avatarPreview.src = url;
    if (avatarStylesEl) highlightActiveStyle();
    return url;
  }

  function highlightActiveStyle() {
    const buttons = avatarStylesEl.querySelectorAll(".avatar-style");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.style === currentStyle);
    });
  }

  function randomSeed() {
    const base = seedWords[Math.floor(Math.random() * seedWords.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    return base + " " + num;
  }

  // ---------- Photo upload (with compression so it fits in storage) ----------
  function handlePhotoFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // Resize to max 512px and compress to JPEG to keep storage small
        const MAX = 512;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        applyPicture({ type: "photo", value: dataUrl });
        showToast("Photo set! It is now Bhaktinandan's profile picture. 🎉");
      };
      img.onerror = function () {
        showToast("Sorry, that image could not be read.");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- Modal open / close ----------
  function openAvatarModal() {
    setAvatar(currentStyle, currentSeed);
    avatarModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeAvatarModal() {
    avatarModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ---------- Build style buttons ----------
  function buildStyleButtons() {
    avatarStylesEl.innerHTML = "";
    AVATAR_STYLES.forEach((style) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-style" + (style.id === currentStyle ? " active" : "");
      btn.dataset.style = style.id;
      btn.innerHTML =
        '<img src="' + avatarUrl(style.id, currentSeed) + '" alt="' + style.label + ' style" loading="lazy" />' +
        "<span>" + style.label + "</span>";
      btn.addEventListener("click", function () {
        setAvatar(style.id, currentSeed);
        showToast("Style: " + style.label + " — tap “Use this avatar” to apply it.");
      });
      avatarStylesEl.appendChild(btn);
    });
  }

  // ---------- Wire up events ----------
  document.getElementById("avatar-btn").addEventListener("click", openAvatarModal);
  document.getElementById("upload-btn").addEventListener("click", function () {
    photoInput.click();
  });
  document.getElementById("nav-upload-btn").addEventListener("click", function () {
    photoInput.click();
  });

  photoInput.addEventListener("change", function () {
    if (photoInput.files && photoInput.files[0]) {
      handlePhotoFile(photoInput.files[0]);
    }
    photoInput.value = "";
  });

  shuffleBtn.addEventListener("click", function () {
    setAvatar(currentStyle, randomSeed());
    showToast("New look! Tap “Use this avatar” to keep it.");
  });

  applyAvatarBtn.addEventListener("click", function () {
    applyPicture({ type: "avatar", value: avatarUrl(currentStyle, currentSeed), style: currentStyle, seed: currentSeed });
    closeAvatarModal();
    showToast("AI avatar applied! ✨");
  });

  // Close on backdrop, close button, or Escape
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeAvatarModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !avatarModal.classList.contains("hidden")) {
      closeAvatarModal();
    }
  });

  // ---------- Init ----------
  function init() {
    buildStyleButtons();

    // Restore saved picture, otherwise use a default AI avatar
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      saved = null;
    }

    if (saved && saved.value) {
      if (saved.type === "photo") {
        applyPicture({ type: "photo", value: saved.value });
      } else if (saved.style) {
        currentStyle = saved.style;
        currentSeed = saved.seed || DEFAULT_SEED;
        applyPicture({ type: "avatar", value: avatarUrl(currentStyle, currentSeed), style: currentStyle, seed: currentSeed });
      }
    } else {
      applyPicture({
        type: "avatar",
        value: avatarUrl(DEFAULT_STYLE, DEFAULT_SEED),
        style: DEFAULT_STYLE,
        seed: DEFAULT_SEED,
      });
    }

    // Refresh style thumbnails with the current seed (in case saved seed differs)
    buildStyleButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();