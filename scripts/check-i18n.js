// Run with: node scripts/check-i18n.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const { I18N_LANGUAGES, I18N_STRINGS, resolveLanguage, t } = require(path.join(root, "i18n.js"));

const resolveCases = {
  pt: "pt_PT",
  "pt-PT": "pt_PT",
  "pt-BR": "pt_BR",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_CN",
  "es-419": "es",
  "de-AT": "de",
  ja: "ja",
  ko: "en",
  "en-GB": "en",
  "": "en",
};
for (const [uiLanguage, expected] of Object.entries(resolveCases)) {
  assert.equal(resolveLanguage("auto", uiLanguage), expected, `auto + ${uiLanguage}`);
}
assert.equal(resolveLanguage("fr", "pt-BR"), "fr", "explicit setting wins");
assert.equal(resolveLanguage("xx", "de"), "de", "unknown setting falls back to auto");
assert.equal(resolveLanguage(undefined, "it"), "it", "missing setting falls back to auto");

assert.equal(t("en", "reasonCounter", { count: 3, min: 50 }), "3 / 50 characters");
assert.equal(t("xx", "continueButton"), I18N_STRINGS.en.continueButton, "unknown language falls back to en");
const saved = I18N_STRINGS.de.continueButton;
delete I18N_STRINGS.de.continueButton;
assert.equal(t("de", "continueButton"), I18N_STRINGS.en.continueButton, "missing key falls back to en");
I18N_STRINGS.de.continueButton = saved;

const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join(",");
const codes = I18N_LANGUAGES.map((language) => language.code);
assert.deepEqual(codes, ["en", "es", "pt_PT", "pt_BR", "fr", "de", "zh_CN", "ja", "ru", "hi", "it"]);
assert.deepEqual(Object.keys(I18N_STRINGS).sort(), [...codes].sort());

const enKeys = Object.keys(I18N_STRINGS.en).sort();
const enLocale = JSON.parse(fs.readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
for (const code of codes) {
  const strings = I18N_STRINGS[code];
  assert.deepEqual(Object.keys(strings).sort(), enKeys, `${code}: keys differ from en`);
  for (const key of enKeys) {
    assert.ok(strings[key].trim(), `${code}.${key} is empty`);
    assert.equal(placeholders(strings[key]), placeholders(I18N_STRINGS.en[key]), `${code}.${key}: placeholders`);
  }

  const locale = JSON.parse(fs.readFileSync(path.join(root, `_locales/${code}/messages.json`), "utf8"));
  assert.deepEqual(Object.keys(locale).sort(), Object.keys(enLocale).sort(), `_locales/${code}: keys differ from en`);
}

console.log(`i18n OK: ${codes.length} languages, ${enKeys.length} keys`);
