// Shared by the test scripts: where the game is, and a Chromium to run it in.
import { chromium } from "playwright-core";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { startMock } from "./mock-jellyfin.mjs";

export const URL = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "index.html")).href;

export function findChromium() {                 // an explicit path, else a Playwright-installed Chromium, else Playwright's own lookup
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const bases = [join(homedir(), "Library/Caches/ms-playwright"), join(homedir(), ".cache/ms-playwright"), join(process.env.LOCALAPPDATA || homedir(), "ms-playwright")];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()) for (const rel of [
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      "chrome-linux/chrome", "chrome-linux64/chrome", "chrome-win64/chrome.exe", "chrome-win/chrome.exe"]) {
      const p = join(base, d, rel); if (existsSync(p)) return p;
    }
  }
  return undefined;
}

// gpu: the machine's real GPU (for timing); otherwise software rendering, which runs anywhere
export const launch = ({ gpu = false } = {}) => chromium.launch({ executablePath: findChromium(), args: gpu
  ? ["--use-angle=default", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit"]
  : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });

// A context already linked to a stand-in Jellyfin (tests/mock-jellyfin.mjs): the game doesn't start till it's linked.
// (Seeded on every page load, since the tests clear localStorage between stores.)
export async function linkedContext(browser, options = {}, library = {}) {
  const mock = await startMock(library), ctx = await browser.newContext(options);
  await ctx.addInitScript(link => { try { if (!localStorage.getItem("jellybuster-link")) localStorage.setItem("jellybuster-link", link); } catch {} }, JSON.stringify(mock.link));
  ctx.mock = mock;
  return ctx;
}
