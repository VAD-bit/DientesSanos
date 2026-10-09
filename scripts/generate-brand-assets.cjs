/* Genera los activos de marca "Dientes Sanos" desde el logo fuente (JPG con fondo blanco).
   Uso: node scripts/generate-brand-assets.cjs
   - Fondo blanco → transparente (con corrección de alfa para que el gris se vea igual)
   - Variantes: horizontal, blanca, marca suelta (favicon/PWA), lockup vertical
   - Los PNG originales de Panda se respaldan en backups/original_brand_assets/ */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = 'C:/Users/user/Downloads/IMG_9108.JPG.jpeg';
const BRAND_DIR = path.join(ROOT, 'brand');
const BACKUP_DIR = path.join(ROOT, 'backups', 'original_brand_assets');

const BACKUPS = [
  'public/favicon.png', 'public/pwa-icon.png', 'public/panda-team-avatar.png',
  'src/assets/panda_menu_logo.png', 'src/assets/sidebar_logo.png',
  'src/assets/panda_logo_black.png', 'src/assets/panda_logo_nobg.png',
  'src/assets/logo_full.png', 'src/assets/logo.png', 'src/assets/temp_check.png',
];

// Fondo blanco → alfa con corrección: el color de origen se reescala para que
// al componter sobre blanco se vea idéntico al JPG original.
async function whiteToRgba(buf, w, h) {
  const src = await sharp(buf).raw().toBuffer();
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++) {
    const r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
    const m = Math.min(r, g, b);
    const a = 255 - m; // cobertura de tinta
    if (a === 0) { out[j + 3] = 0; j += 4; continue; }
    const k = a / 255;
    out[j] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - k)) / k)));
    out[j + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - k)) / k)));
    out[j + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - k)) / k)));
    out[j + 3] = a;
    j += 4;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

// Variante blanca: misma cobertura, tinta blanca (para fondos oscuros)
async function whiteInk(buf, w, h) {
  const src = await sharp(buf).raw().toBuffer();
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++) {
    const m = Math.min(src[i * 3], src[i * 3 + 1], src[i * 3 + 2]);
    out[j] = 255; out[j + 1] = 255; out[j + 2] = 255;
    out[j + 3] = 255 - m;
    j += 4;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

async function main() {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // 1) Backup de origales (solo la primera vez)
  for (const rel of BACKUPS) {
    const p = path.join(ROOT, rel);
    const b = path.join(BACKUP_DIR, path.basename(rel));
    if (fs.existsSync(p) && !fs.existsSync(b)) fs.copyFileSync(p, b);
  }

  // 2) Copia del logo fuente dentro del repo
  const srcCopy = path.join(BRAND_DIR, 'logo_source.jpeg');
  if (!fs.existsSync(srcCopy)) fs.copyFileSync(SRC, srcCopy);

  const meta = await sharp(SRC).metadata();
  const srcBuf = await sharp(SRC).toBuffer();
  const alpha = await whiteToRgba(srcBuf, meta.width, meta.height);
  const alphaBuf = await alpha.png().toBuffer();

  // 3) Horizontal completo (recortado a contenido)
  const horizontal = await sharp(alphaBuf).trim({ threshold: 8 }).resize({ width: 1568, withoutEnlargement: true }).png().toBuffer();
  fs.writeFileSync(path.join(BRAND_DIR, 'logo_horizontal.png'), horizontal);

  // 4) Variante blanca (tinta blanca con la misma cobertura)
  const white = await whiteInk(srcBuf, meta.width, meta.height);
  const whiteBuf = await white.trim({ threshold: 8 }).png().toBuffer();
  fs.writeFileSync(path.join(BRAND_DIR, 'logo_white.png'), whiteBuf);

  // 5) Marca suelta (diente-corazón) → bbox exacto medido en la fuente
  const markRaw = await sharp(alphaBuf)
    .extract({ left: 48, top: 49, width: 344, height: 402 })
    .png().toBuffer();
  const markMeta = await sharp(markRaw).metadata();
  const S = Math.max(markMeta.width, markMeta.height) + 24;
  const markSquare = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: markRaw, gravity: 'center' }])
    .png().toBuffer();
  fs.writeFileSync(path.join(BRAND_DIR, 'mark_square.png'), markSquare);

  // 6) Lockup vertical: marca + "Centro Odontológico" + "Dientes Sanos"
  const mark460 = await sharp(markRaw).resize({ height: 430 }).png().toBuffer();
  const topLine = await sharp(alphaBuf)
    .extract({ left: 405, top: 63, width: 690, height: 71 })
    .resize({ width: 470 }).png().toBuffer();
  const wordLine = await sharp(alphaBuf)
    .extract({ left: 400, top: 144, width: 1055, height: 172 })
    .resize({ width: 690 }).png().toBuffer();

  const m460 = await sharp(mark460).metadata();
  const tl = await sharp(topLine).metadata();
  const wl = await sharp(wordLine).metadata();
  const VW = 760, gap = 22;
  const contentH = m460.height + gap + tl.height + 8 + wl.height;
  const VH = contentH + 60;
  const vertical = await sharp({ create: { width: VW, height: VH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: mark460, left: Math.round((VW - m460.width) / 2), top: 24 },
      { input: topLine, left: Math.round((VW - tl.width) / 2), top: 24 + m460.height + gap },
      { input: wordLine, left: Math.round((VW - wl.width) / 2), top: 24 + m460.height + gap + tl.height + 8 },
    ])
    .png().toBuffer();
  fs.writeFileSync(path.join(BRAND_DIR, 'logo_vertical.png'), vertical);

  // 7) Destinos (mismos nombres → sin cambios de imports)
  const dest = (rel, buf) => fs.writeFileSync(path.join(ROOT, rel), buf);
  const mark512 = await sharp(markSquare).resize({ width: 512, height: 512 }).png().toBuffer();
  const mark1080 = await sharp(markSquare).resize({ width: 1080, height: 1080 }).png().toBuffer();
  dest('public/favicon.png', mark512);
  dest('public/pwa-icon.png', mark512);
  dest('public/panda-team-avatar.png', mark512);
  dest('src/assets/panda_menu_logo.png', horizontal);
  dest('src/assets/sidebar_logo.png', horizontal);
  dest('src/assets/panda_logo_black.png', horizontal);
  dest('src/assets/panda_logo_nobg.png', horizontal);
  dest('src/assets/logo_full.png', vertical);
  dest('src/assets/logo.png', mark1080);
  dest('src/assets/temp_check.png', mark1080);

  // 8) favicon.svg (diente-corazón estilizado)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<path d="M32 59C13 44.5 3.5 33.5 3.5 21.5 3.5 11 11.5 3.5 21 3.5c5.2 0 9.3 2.3 11 6 1.7-3.7 5.8-6 11-6 9.5 0 17.5 7.5 17.5 18C60.5 33.5 51 44.5 32 59z" fill="#111111"/>
<path d="M32 13.5c-6.4 0-10.8 4.7-10.8 12 0 8.5 3.3 20 6.4 25.1 1.6 2.6 7.2 2.6 8.8 0 3.1-5.1 6.4-16.6 6.4-25.1 0-7.3-4.4-12-10.8-12z" fill="#ffffff"/>
</svg>`;
  fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), svg);

  console.log('OK: activos generados en brand/ y copiados a destinos.');
}
main().catch((e) => { console.error(e); process.exit(1); });
