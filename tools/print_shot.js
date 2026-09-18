// Screenshot a page as the printer sees it.
//
// Chrome's --screenshot flag renders screen media, so it cannot tell you
// whether a print stylesheet works. This drives Chrome over the DevTools
// protocol instead: load the page, switch the emulated media to `print`,
// then capture. That is the only way to see @media print rules without
// standing over a printer.
//
// Node 22's global WebSocket is the whole dependency.
//
// Usage: node tools/print_shot.js <file-or-url> <out.png> [heightPx]

const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(p => fs.existsSync(p));

const [url, out, height] = process.argv.slice(2);
if (!CHROME || !url || !out) {
  console.error("usage: node tools/print_shot.js <url> <out.png> [heightPx]");
  process.exit(2);
}

// 768 CSS px ~= 203mm at 96dpi, i.e. the quarto width the @page rule asks for.
const WIDTH = 768;
const HEIGHT = Number(height) || 960;
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + require("os").tmpdir() + "/print_shot_profile",
  "about:blank",
], { stdio: "ignore" });

const get = path => new Promise((res, rej) => {
  http.get({ host: "127.0.0.1", port: PORT, path }, r => {
    let d = ""; r.on("data", c => (d += c)); r.on("end", () => res(JSON.parse(d)));
  }).on("error", rej);
});

const waitFor = async () => {
  for (let i = 0; i < 60; i++) {
    try { return await get("/json/version"); }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  throw new Error("Chrome did not open a debugging port");
};

(async () => {
  try {
    await waitFor();
    const { webSocketDebuggerUrl } = await get("/json/version");
    const ws = new WebSocket(webSocketDebuggerUrl);
    await new Promise(r => (ws.onopen = r));

    let id = 0;
    const pending = new Map();
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    };
    const send = (method, params, sessionId) => new Promise(res => {
      const n = ++id;
      pending.set(n, res);
      ws.send(JSON.stringify({ id: n, method, params: params || {}, sessionId }));
    });

    const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
    const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });

    await send("Page.enable", {}, sessionId);
    await send("Emulation.setDeviceMetricsOverride",
               { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: false }, sessionId);
    await send("Page.navigate", { url }, sessionId);
    await new Promise(r => setTimeout(r, 2500));

    // The point of the whole exercise.
    await send("Emulation.setEmulatedMedia", { media: "print" }, sessionId);
    await new Promise(r => setTimeout(r, 600));

    const { result: { contentSize } } = await send("Page.getLayoutMetrics", {}, sessionId);
    const shot = await send("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: WIDTH,
              height: Math.min(contentSize.height, 4000), scale: 1 },
    }, sessionId);

    if (!shot.result || !shot.result.data) throw new Error("no screenshot returned");
    fs.writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    console.log("wrote " + out + "  (print media, content height " +
                Math.round(contentSize.height) + "px)");
    ws.close();
  } catch (e) {
    console.error("FAILED: " + e.message);
    process.exitCode = 1;
  } finally {
    chrome.kill();
  }
})();
