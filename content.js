const IWB_STORAGE_KEY = "blockedSites";
const IWB_ALLOWANCES_KEY = "activeAllowances";
const IWB_OVERLAY_ID = "iwb-block-overlay";
const IWB_BANNER_ID = "iwb-reason-banner";
const IWB_BANNER_ACTIVE_CLASS = "iwb-banner-active";

let countdownIntervalId = null;
let allowedUntil = 0;
let currentReason = "";
let currentBlockedDomain = "";

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
  document.documentElement.classList.remove(IWB_BANNER_ACTIVE_CLASS);
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
  reasonText.textContent = `I'm only using this because: ${currentReason}`;
  timerText.textContent = `Time left: ${formatRemainingTime(remaining)}`;
}

function showBanner(reason, expiryTime, domain) {
  removeBanner();
  stopCountdown();

  currentReason = reason;
  allowedUntil = expiryTime;
  currentBlockedDomain = domain;

  const banner = document.createElement("div");
  banner.id = IWB_BANNER_ID;

  const reasonText = document.createElement("span");
  reasonText.id = "iwb-banner-reason";

  const timerText = document.createElement("span");
  timerText.id = "iwb-banner-timer";

  banner.append(reasonText, timerText);
  document.documentElement.appendChild(banner);
  document.documentElement.classList.add(IWB_BANNER_ACTIVE_CLASS);
  updateBannerCountdown();

  countdownIntervalId = setInterval(updateBannerCountdown, 1000);
}

function showBlockOverlay(blockedDomain = currentBlockedDomain) {
  if (document.getElementById(IWB_OVERLAY_ID)) return;

  stopCountdown();
  removeBanner();
  currentBlockedDomain = blockedDomain;

  const overlay = document.createElement("div");
  overlay.id = IWB_OVERLAY_ID;

  const card = document.createElement("div");
  card.id = "iwb-block-card";

  const message = document.createElement("p");
  message.textContent = "You've decided to block this website! Do you really need to use it? If so, leave a message bellow with the reason and proceed";

  const reason = document.createElement("textarea");
  reason.id = "iwb-reason";
  reason.placeholder = "Write your reason here...";
  reason.setAttribute("aria-label", "Reason to continue");

  const timeLabel = document.createElement("label");
  timeLabel.id = "iwb-time-row";
  timeLabel.textContent = "How many minutes will you use this website?";

  const minutesInput = document.createElement("input");
  minutesInput.id = "iwb-minutes";
  minutesInput.type = "number";
  minutesInput.min = "1";
  minutesInput.max = "60";
  minutesInput.value = "15";
  minutesInput.setAttribute("aria-label", "Minutes to use this website");

  timeLabel.appendChild(minutesInput);

  const checkboxLabel = document.createElement("label");
  checkboxLabel.id = "iwb-checkbox-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const checkboxText = document.createElement("span");
  checkboxText.textContent = "I declare that I really need to use this and I'm not sabotaging myself with this action.";

  const button = document.createElement("button");
  button.id = "iwb-continue";
  button.type = "button";
  button.textContent = "Continue";
  button.disabled = true;

  const getSelectedMinutes = () => Number(minutesInput.value);

  const updateButton = () => {
    const minutes = getSelectedMinutes();
    const hasValidTime = Number.isInteger(minutes) && minutes >= 1 && minutes <= 60;
    button.disabled = reason.value.trim().length === 0 || !checkbox.checked || !hasValidTime;
  };

  reason.addEventListener("input", updateButton);
  minutesInput.addEventListener("input", updateButton);
  checkbox.addEventListener("change", updateButton);
  button.addEventListener("click", async () => {
    const finalReason = reason.value.trim();
    const minutes = getSelectedMinutes();
    if (!finalReason || !checkbox.checked || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) return;

    const allowance = await saveAllowance(currentBlockedDomain, finalReason, minutes);
    removeOverlay();
    showBanner(allowance.reason, allowance.allowedUntil, currentBlockedDomain);
  });

  checkboxLabel.append(checkbox, checkboxText);
  card.append(message, reason, timeLabel, checkboxLabel, button);
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
