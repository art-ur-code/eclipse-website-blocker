const STORAGE_KEY = "blockedSites";
const SETTINGS_KEY = "minReasonChars";
const DEFAULT_MIN_REASON_CHARS = 50;

const form = document.getElementById("add-form");
const input = document.getElementById("domain-input");
const list = document.getElementById("sites-list");
const error = document.getElementById("error");
const minCharsInput = document.getElementById("min-chars-input");

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

async function getBlockedSites() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
  return result[STORAGE_KEY];
}

async function setBlockedSites(sites) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: sites });
}

function render(sites) {
  list.textContent = "";

  if (sites.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "No blocked sites yet.";
    list.appendChild(item);
    return;
  }

  for (const site of sites) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const remove = document.createElement("button");

    label.textContent = site;
    remove.textContent = "Remove";
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
    error.textContent = "Enter a valid domain, like example.com.";
    return;
  }

  const sites = await getBlockedSites();
  if (!sites.includes(domain)) {
    sites.push(domain);
    sites.sort();
    await setBlockedSites(sites);
  }

  input.value = "";
  render(await getBlockedSites());
});

getBlockedSites().then(render);

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

getMinReasonChars().then((minChars) => {
  minCharsInput.value = minChars;
});
