const IWB_STORAGE_KEY = "blockedSites";
const IWB_ALLOWANCES_KEY = "activeAllowances";
const IWB_SETTINGS_KEY = "minReasonChars";
const IWB_DEFAULT_MIN_REASON_CHARS = 50;
const IWB_OVERLAY_ID = "iwb-block-overlay";
const IWB_BANNER_ID = "iwb-reason-banner";

let countdownIntervalId = null;
let allowedUntil = 0;
let currentReason = "";
let currentBlockedDomain = "";
let currentLang = "en";

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function domainMatches(hostname, blockedDomain) {
  const host = normalizeHost(hostname);
  const blocked = normalizeHost(blockedDomain);
  return host === blocked || host.endsWith(`.${blocked}`);
}

async function getBlockedSites() {
  const result = await chrome.storage.sync.get({ [IWB_STORAGE_KEY]: [] });
  return result[IWB_STORAGE_KEY];
}

async function getActiveAllowances() {
  const result = await chrome.storage.local.get({ [IWB_ALLOWANCES_KEY]: {} });
  return result[IWB_ALLOWANCES_KEY];
}

async function getMinReasonChars() {
  const result = await chrome.storage.sync.get({ [IWB_SETTINGS_KEY]: IWB_DEFAULT_MIN_REASON_CHARS });
  return result[IWB_SETTINGS_KEY];
}

async function saveAllowance(domain, reason, minutes) {
  const allowances = await getActiveAllowances();
  allowances[domain] = {
    reason,
    allowedUntil: Date.now() + minutes * 60 * 1000,
  };
  await chrome.storage.local.set({ [IWB_ALLOWANCES_KEY]: allowances });
  return allowances[domain];
}

async function removeAllowance(domain) {
  if (!domain) return;
  const allowances = await getActiveAllowances();
  if (!allowances[domain]) return;
  delete allowances[domain];
  await chrome.storage.local.set({ [IWB_ALLOWANCES_KEY]: allowances });
}

function getMatchedBlockedDomain(blockedSites) {
  return blockedSites.find((site) => domainMatches(window.location.hostname, site)) || "";
}

function removeOverlay() {
  document.getElementById(IWB_OVERLAY_ID)?.remove();
}

function removeBanner() {
  document.getElementById(IWB_BANNER_ID)?.remove();
}

function stopCountdown() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function lockWebsiteAgain() {
  const domainToLock = currentBlockedDomain;

  stopCountdown();
  allowedUntil = 0;
  currentReason = "";
  currentBlockedDomain = "";

  removeBanner();
  await removeAllowance(domainToLock);
  showBlockOverlay(domainToLock);
}

function updateBannerCountdown() {
  const banner = document.getElementById(IWB_BANNER_ID);
  if (!banner) return;

  const remaining = allowedUntil - Date.now();
  if (remaining <= 0) {
    lockWebsiteAgain();
    return;
  }

  const reasonText = banner.querySelector("#iwb-banner-reason");
  const timerText = banner.querySelector("#iwb-banner-timer");
  reasonText.textContent = t(currentLang, "bannerReason", { reason: currentReason });
  if (!timerText.dataset.hovering) {
    timerText.textContent = t(currentLang, "bannerTimeLeft", { time: formatRemainingTime(remaining) });
  }
}

function showBanner(reason, expiryTime, domain) {
  removeBanner();
  stopCountdown();

  currentReason = reason;
  allowedUntil = expiryTime;
  currentBlockedDomain = domain;

  const banner = document.createElement("div");
  banner.id = IWB_BANNER_ID;
  banner.style.cssText = [
    "all: initial",
    "box-sizing: border-box",
    "position: fixed",
    "left: 0",
    "right: 0",
    "bottom: 0",
    "z-index: 2147483647",
    "display: flex",
    "align-items: center",
    "justify-content: space-between",
    "gap: 16px",
    "height: 34px",
    "padding: 0 14px",
    "background: #0b0908",
    "border-top: 1px solid rgba(255, 176, 82, 0.22)",
    "color: #f3ece3",
    "font: 600 12.5px/1.3 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  ].join(";");

  const reasonText = document.createElement("span");
  reasonText.id = "iwb-banner-reason";
  reasonText.style.cssText = [
    "all: initial",
    "box-sizing: border-box",
    "display: block",
    "flex: 1 1 auto",
    "min-width: 0",
    "overflow: hidden",
    "text-align: left",
    "text-overflow: ellipsis",
    "white-space: nowrap",
    "color: inherit",
    "font: inherit",
  ].join(";");

  const timerText = document.createElement("button");
  timerText.id = "iwb-banner-timer";
  timerText.type = "button";
  timerText.setAttribute("aria-label", t(currentLang, "stopLabel"));
  timerText.style.cssText = [
    "all: initial",
    "box-sizing: border-box",
    "display: block",
    "flex: 0 0 auto",
    "min-width: 116px",
    "text-align: center",
    "background: rgba(255, 176, 82, 0.12)",
    "border: 1px solid rgba(255, 176, 82, 0.28)",
    "border-radius: 999px",
    "padding: 3px 10px",
    "white-space: nowrap",
    "color: #ffb052",
    "font: inherit",
    "font-variant-numeric: tabular-nums",
    "cursor: pointer",
    "transition: background 0.15s, border-color 0.15s, color 0.15s",
  ].join(";");

  timerText.addEventListener("mouseenter", () => {
    timerText.dataset.hovering = "true";
    timerText.textContent = t(currentLang, "stopButton");
    timerText.style.background = "rgba(255, 107, 107, 0.16)";
    timerText.style.borderColor = "rgba(255, 107, 107, 0.4)";
    timerText.style.color = "#ff6b6b";
  });

  timerText.addEventListener("mouseleave", () => {
    delete timerText.dataset.hovering;
    timerText.style.background = "rgba(255, 176, 82, 0.12)";
    timerText.style.borderColor = "rgba(255, 176, 82, 0.28)";
    timerText.style.color = "#ffb052";
    updateBannerCountdown();
  });

  timerText.addEventListener("click", () => {
    lockWebsiteAgain();
  });

  banner.append(reasonText, timerText);
  document.documentElement.appendChild(banner);
  updateBannerCountdown();

  countdownIntervalId = setInterval(updateBannerCountdown, 1000);
}

async function showBlockOverlay(blockedDomain = currentBlockedDomain) {
  if (document.getElementById(IWB_OVERLAY_ID)) return;

  stopCountdown();
  removeBanner();
  currentBlockedDomain = blockedDomain;

  const [minReasonChars, lang] = await Promise.all([getMinReasonChars(), getLanguage()]);
  if (document.getElementById(IWB_OVERLAY_ID) || currentBlockedDomain !== blockedDomain) return;
  currentLang = lang;

  const overlay = document.createElement("div");
  overlay.id = IWB_OVERLAY_ID;

  const card = document.createElement("div");
  card.id = "iwb-block-card";

  const icon = document.createElement("img");
  icon.id = "iwb-block-icon";
  icon.src = chrome.runtime.getURL("icon.png");
  icon.alt = "";

  const message = document.createElement("p");
  message.textContent = t(lang, "overlayMessage");

  const reason = document.createElement("textarea");
  reason.id = "iwb-reason";
  reason.placeholder = t(lang, "reasonPlaceholder", { min: minReasonChars });
  reason.setAttribute("aria-label", t(lang, "reasonLabel"));

  const reasonCounter = document.createElement("p");
  reasonCounter.id = "iwb-reason-counter";

  const timeLabel = document.createElement("label");
  timeLabel.id = "iwb-time-row";

  const timeLabelText = document.createElement("span");
  timeLabelText.textContent = t(lang, "timeQuestion");

  const minutesValue = document.createElement("span");
  minutesValue.id = "iwb-minutes-value";

  const timeLabelTop = document.createElement("div");
  timeLabelTop.id = "iwb-time-row-top";
  timeLabelTop.append(timeLabelText, minutesValue);

  const minutesInput = document.createElement("input");
  minutesInput.id = "iwb-minutes";
  minutesInput.type = "range";
  minutesInput.min = "5";
  minutesInput.max = "60";
  minutesInput.step = "5";
  minutesInput.value = "10";
  minutesInput.setAttribute("aria-label", t(lang, "minutesLabel"));

  const updateMinutesValue = () => {
    minutesValue.textContent = t(lang, "minutesValue", { minutes: minutesInput.value });
    const percent = ((minutesInput.value - minutesInput.min) / (minutesInput.max - minutesInput.min)) * 100;
    minutesInput.style.setProperty("--iwb-progress", `${percent}%`);
  };
  updateMinutesValue();
  minutesInput.addEventListener("input", updateMinutesValue);

  timeLabel.append(timeLabelTop, minutesInput);

  const checkboxLabel = document.createElement("label");
  checkboxLabel.id = "iwb-checkbox-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const checkboxText = document.createElement("span");
  checkboxText.textContent = t(lang, "declaration");

  const button = document.createElement("button");
  button.id = "iwb-continue";
  button.type = "button";
  button.textContent = t(lang, "continueButton");
  button.disabled = true;

  const getSelectedMinutes = () => Number(minutesInput.value);
  const getReasonLength = () => reason.value.trim().length;

  const updateReasonCounter = () => {
    const length = getReasonLength();
    reasonCounter.textContent = t(lang, "reasonCounter", { count: length, min: minReasonChars });
    reasonCounter.classList.remove("iwb-reason-counter-blocked");
    reasonCounter.classList.toggle("iwb-reason-counter-met", length >= minReasonChars);
  };

  let pasteHintTimeoutId = null;
  const blockPaste = (event) => {
    event.preventDefault();
    clearTimeout(pasteHintTimeoutId);
    reasonCounter.textContent = t(lang, "pasteBlocked");
    reasonCounter.classList.remove("iwb-reason-counter-met");
    reasonCounter.classList.add("iwb-reason-counter-blocked");
    pasteHintTimeoutId = setTimeout(updateReasonCounter, 2000);
  };

  const updateButton = () => {
    const minutes = getSelectedMinutes();
    const hasValidTime = Number.isInteger(minutes) && minutes >= 1 && minutes <= 60;
    updateReasonCounter();
    button.disabled = getReasonLength() < minReasonChars || !checkbox.checked || !hasValidTime;
  };

  updateButton();
  reason.addEventListener("input", updateButton);
  reason.addEventListener("paste", blockPaste);
  reason.addEventListener("drop", blockPaste);
  minutesInput.addEventListener("input", updateButton);
  checkbox.addEventListener("change", updateButton);
  button.addEventListener("click", async () => {
    const finalReason = reason.value.trim();
    const minutes = getSelectedMinutes();
    if (finalReason.length < minReasonChars || !checkbox.checked || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) return;

    const allowance = await saveAllowance(currentBlockedDomain, finalReason, minutes);
    removeOverlay();
    showBanner(allowance.reason, allowance.allowedUntil, currentBlockedDomain);
  });

  checkboxLabel.append(checkbox, checkboxText);
  card.append(icon, message, reason, reasonCounter, timeLabel, checkboxLabel, button);
  overlay.appendChild(card);
  document.documentElement.appendChild(overlay);
  reason.focus();
}

async function enforceBlockList() {
  const blockedSites = await getBlockedSites();
  const matchedDomain = getMatchedBlockedDomain(blockedSites);

  if (!matchedDomain) {
    stopCountdown();
    currentBlockedDomain = "";
    removeOverlay();
    removeBanner();
    return;
  }

  currentBlockedDomain = matchedDomain;
  const allowances = await getActiveAllowances();
  const allowance = allowances[matchedDomain];

  if (allowance && allowance.allowedUntil > Date.now()) {
    currentLang = await getLanguage();
    removeOverlay();
    showBanner(allowance.reason, allowance.allowedUntil, matchedDomain);
    return;
  }

  if (allowance) {
    await removeAllowance(matchedDomain);
  }

  showBlockOverlay(matchedDomain);
}

function start() {
  enforceBlockList();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    const blockedSitesChanged = areaName === "sync" && changes[IWB_STORAGE_KEY];
    const allowancesChanged = areaName === "local" && changes[IWB_ALLOWANCES_KEY];

    if (blockedSitesChanged || allowancesChanged) {
      enforceBlockList();
    }
  });
}

if (document.documentElement) {
  start();
} else {
  document.addEventListener("DOMContentLoaded", start, { once: true });
}
