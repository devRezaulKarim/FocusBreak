const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#60a5fa"/>
    </linearGradient>
  </defs>

  <rect x="16" y="16" width="224" height="224" rx="54" fill="url(#bgGrad)"/>
  <circle cx="128" cy="128" r="74" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="14"/>
  <circle cx="128" cy="128" r="74" fill="none" stroke="url(#accentGrad)" stroke-width="14"
          stroke-linecap="round" stroke-dasharray="350 465" transform="rotate(-90 128 128)"/>

  <rect x="108" y="96" width="14" height="64" rx="7" fill="#ffffff"/>
  <rect x="134" y="96" width="14" height="64" rx="7" fill="#ffffff"/>
  <circle cx="128" cy="38" r="6" fill="#93c5fd"/>
</svg>`;

app.whenReady().then(async () => {
  try {
    const assetsDir = path.join(__dirname, '../assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgContent, 'utf8');

    const win = new BrowserWindow({
      width: 256,
      height: 256,
      show: false,
      transparent: true,
      frame: false,
      webPreferences: { offscreen: true }
    });

    await win.loadURL('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent));
    await new Promise((r) => setTimeout(r, 600));

    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
    const pngBuffer = image.toPNG();
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
    console.log('Generated icon.png, size:', pngBuffer.length);

    // Build standard Windows ICO containing the PNG
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0);   // width 256
    entry.writeUInt8(0, 1);   // height 256
    entry.writeUInt8(0, 2);   // color count (0)
    entry.writeUInt8(0, 3);   // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8); // size of image data
    entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

    const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
    console.log('Generated icon.ico, total size:', icoBuffer.length);

    win.destroy();
  } catch (err) {
    console.error('Error generating icons:', err);
  } finally {
    app.quit();
  }
});
