import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const zip = process.argv[2] ?? `.output/scrollplus-${pkg.version}-chrome.zip`;
execFileSync("unzip", ["-t", zip], { stdio: "pipe" });
const manifest = JSON.parse(execFileSync("unzip", ["-p", zip, "manifest.json"], { encoding: "utf8" }));
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.minimum_chrome_version, "120");
assert.deepEqual(manifest.permissions, ["storage"]);
assert.deepEqual([...manifest.host_permissions].sort(), ["https://www.instagram.com/*", "https://www.tiktok.com/*", "https://www.youtube.com/*"]);
assert.equal(manifest.default_locale, "en");
assert.ok(!manifest.externally_connectable);
const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n");
assert.ok(entries.every((entry) => !entry.startsWith("/") && !entry.split("/").includes("..") && !/^(qa|scripts|e2e|node_modules)\//.test(entry)));
for (const content of manifest.content_scripts) assert.ok(content.js.every((entry) => entries.includes(entry)));
const images = [];
function checkPng(file, width, height) {
  const data = fs.readFileSync(file);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(data.readUInt32BE(16), width, file);
  assert.equal(data.readUInt32BE(20), height, file);
  images.push({ file, width, height });
}
for (const size of [16, 32, 48, 128]) {
  checkPng(`public/icon/${size}.png`, size, size);
  assert.ok(execFileSync("unzip", ["-p", zip, `icon/${size}.png`]).equals(fs.readFileSync(`public/icon/${size}.png`)));
}
for (const suffix of ["", "-ko"]) {
  checkPng(`store/tile${suffix}.png`, 440, 280);
  checkPng(`store/marquee${suffix}.png`, 1400, 560);
}
for (const folder of ["store/screenshots", "store/screenshots/ko"]) {
  for (const name of ["popup", "options", "chip"]) checkPng(`${folder}/${name}.png`, 1280, 800);
}
const locales = ["en", "ko"].map((locale) => JSON.parse(fs.readFileSync(`public/_locales/${locale}/messages.json`, "utf8")));
assert.deepEqual(Object.keys(locales[0]).sort(), Object.keys(locales[1]).sort());
for (const locale of locales) {
  assert.ok(locale.extName.message.length <= 75);
  assert.ok(locale.extDesc.message.length <= 132);
}
console.log(JSON.stringify({ zip, bytes: fs.statSync(zip).size, version: manifest.version, entries: entries.length, images }, null, 2));
