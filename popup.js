const STORAGE_KEY = "blockedSites";
const SETTINGS_KEY = "minReasonChars";
const DEFAULT_MIN_REASON_CHARS = 50;

const form = document.getElementById("add-form");
const input = document.getElementById("domain-input");
const list = document.getElementById("sites-list");
const error = document.getElementById("error");
const minCharsInput = document.getElementById("min-chars-input");
const languageSelect = document.getElementById("language-select");
const blockCurrent = document.getElementById("block-current");
const sitesCount = document.getElementById("sites-count");

let lang = "en";
let languageSetting = "auto";
let currentSite = "";

function normalizeDomain(value) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isValidDomain(domain) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) && !domain.includes("..");
}

function isBlocked(domain, sites) {
  return sites.some((site) => domain === site || domain.endsWith(`.${site}`));
}

async function getBlockedSites() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
  return result[STORAGE_KEY];
}

async function setBlockedSites(sites) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: sites });
}

async function addSite(domain) {
  const sites = await getBlockedSites();
  if (!sites.includes(domain)) {
    sites.push(domain);
    sites.sort();
    await setBlockedSites(sites);
  }
  render(await getBlockedSites());
}

// Only real web pages can be blocked; the Web Store and chrome:// pages never run content scripts.
async function getCurrentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const url = new URL(tab?.url ?? "");
    const isWebStore = url.hostname === "chromewebstore.google.com" || (url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore"));
    if (!["http:", "https:"].includes(url.protocol) || isWebStore) return "";
    const domain = normalizeDomain(url.hostname);
    return isValidDomain(domain) ? domain : "";
  } catch {
    return "";
  }
}

function showScreen(id) {
  for (const section of document.querySelectorAll("main > section")) {
    section.hidden = section.id !== id;
  }
}

function applyTranslations() {
  document.documentElement.lang = lang.replace("_", "-");
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(lang, element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria]")) {
    element.setAttribute("aria-label", t(lang, element.dataset.i18nAria));
  }

  languageSelect.textContent = "";
  languageSelect.append(
    new Option(t(lang, "languageAuto"), "auto"),
    ...I18N_LANGUAGES.map((language) => new Option(language.name, language.code)),
  );
  languageSelect.value = languageSetting;
}

function renderBlockCurrent(sites) {
  blockCurrent.hidden = !currentSite;
  if (!currentSite) return;

  const blocked = isBlocked(currentSite, sites);
  blockCurrent.disabled = blocked;
  blockCurrent.textContent = t(lang, blocked ? "siteAlreadyBlocked" : "blockCurrentSite", { site: currentSite });
}

function render(sites) {
  list.textContent = "";
  sitesCount.textContent = sites.length;
  renderBlockCurrent(sites);

  if (sites.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = t(lang, "noBlockedSites");
    list.appendChild(item);
    return;
  }

  for (const site of sites) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const remove = document.createElement("button");

    label.textContent = site;
    remove.textContent = t(lang, "removeButton");
    remove.className = "remove";
    remove.type = "button";
    remove.addEventListener("click", async () => {
      const currentSites = await getBlockedSites();
      await setBlockedSites(currentSites.filter((domain) => domain !== site));
      render(await getBlockedSites());
    });

    item.append(label, remove);
    list.appendChild(item);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";

  const domain = normalizeDomain(input.value);
  if (!isValidDomain(domain)) {
    error.textContent = t(lang, "invalidDomain");
    return;
  }

  input.value = "";
  await addSite(domain);
});

blockCurrent.addEventListener("click", () => addSite(currentSite));

document.getElementById("open-settings").addEventListener("click", () => showScreen("settings"));
document.getElementById("open-sites").addEventListener("click", () => showScreen("sites"));
for (const back of document.querySelectorAll(".back")) {
  back.addEventListener("click", () => showScreen("home"));
}

languageSelect.addEventListener("change", async () => {
  languageSetting = languageSelect.value;
  lang = resolveLanguage(languageSetting, chrome.i18n.getUILanguage());
  await chrome.storage.sync.set({ [I18N_LANGUAGE_KEY]: languageSetting });
  error.textContent = "";
  applyTranslations();
  render(await getBlockedSites());
});

async function getMinReasonChars() {
  const result = await chrome.storage.sync.get({ [SETTINGS_KEY]: DEFAULT_MIN_REASON_CHARS });
  return result[SETTINGS_KEY];
}

async function setMinReasonChars(minChars) {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: minChars });
}

minCharsInput.addEventListener("change", async () => {
  const minChars = Math.max(0, Math.floor(Number(minCharsInput.value)) || 0);
  minCharsInput.value = minChars;
  await setMinReasonChars(minChars);
});

async function init() {
  const stored = await chrome.storage.sync.get({ [I18N_LANGUAGE_KEY]: "auto" });
  languageSetting = Object.hasOwn(I18N_STRINGS, stored[I18N_LANGUAGE_KEY]) ? stored[I18N_LANGUAGE_KEY] : "auto";
  lang = resolveLanguage(languageSetting, chrome.i18n.getUILanguage());
  currentSite = await getCurrentSite();

  applyTranslations();
  render(await getBlockedSites());
  minCharsInput.value = await getMinReasonChars();
}

init();
