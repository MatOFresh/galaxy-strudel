// Génère icon-192.png et icon-512.png (encodeur PNG maison, zlib natif).
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body), 0);
  return Buffer.concat([len, body, crc]);
}

function mix(a, b, t) { return a + (b - a) * t; }

function makePNG(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = size * 0.5;
  // couleurs
  const c0 = [56, 249, 215];   // cyan (centre)
  const c1 = [160, 107, 255];  // violet
  const c2 = [255, 78, 205];   // magenta
  const bg = [8, 3, 20];
  // étoiles fixes
  const stars = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 40; i++) stars.push([rnd() * size, rnd() * size, 0.5 + rnd() * 1.5]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / R; // 0 centre -> 1 bord
      let r, g, b, a = 255;
      if (d > 0.98) { r = bg[0]; g = bg[1]; b = bg[2]; a = 0; }
      else {
        // dégradé radial cyan -> violet -> magenta
        let col;
        if (d < 0.5) col = c0.map((v, k) => mix(v, c1[k], d / 0.5));
        else col = c1.map((v, k) => mix(v, c2[k], (d - 0.5) / 0.5));
        // assombrir vers le bord
        const shade = 1 - d * 0.35;
        r = col[0] * shade; g = col[1] * shade; b = col[2] * shade;
      }
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
    }
  }
  // étoiles blanches
  for (const [sx, sy, sr] of stars) {
    for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) {
      const X = Math.round(sx + xx), Y = Math.round(sy + yy);
      if (X < 0 || Y < 0 || X >= size || Y >= size) continue;
      const dd = Math.sqrt(xx * xx + yy * yy);
      if (dd > sr) continue;
      const i = (Y * size + X) * 4;
      if (px[i + 3] === 0) continue;
      const a = 1 - dd / (sr + 0.5);
      px[i] = mix(px[i], 255, a); px[i + 1] = mix(px[i + 1], 255, a); px[i + 2] = mix(px[i + 2], 255, a);
    }
  }
  // grosse étoile centrale (croix scintillante)
  const drawGlow = (gx, gy, rad) => {
    for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) {
      const X = Math.round(gx + xx), Y = Math.round(gy + yy);
      if (X < 0 || Y < 0 || X >= size || Y >= size) continue;
      const dd = Math.sqrt(xx * xx + yy * yy) / rad;
      const beam = Math.max(0, 1 - Math.abs(xx) / rad) * Math.max(0, 1 - Math.abs(yy) / (rad * 0.12)) +
                   Math.max(0, 1 - Math.abs(yy) / rad) * Math.max(0, 1 - Math.abs(xx) / (rad * 0.12));
      const core = Math.max(0, 1 - dd);
      const a = Math.min(1, core * 1.2 + beam * 0.9);
      if (a <= 0) continue;
      const i = (Y * size + X) * 4;
      if (px[i + 3] === 0) px[i + 3] = 255;
      px[i] = mix(px[i], 255, a); px[i + 1] = mix(px[i + 1], 255, a); px[i + 2] = mix(px[i + 2], 255, a);
    }
  };
  drawGlow(cx, cy, size * 0.16);

  // scanlines filtrées (filter 0)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const s of [192, 512]) {
  const buf = makePNG(s);
  writeFileSync(new URL(`./icon-${s}.png`, import.meta.url), buf);
  console.log(`icon-${s}.png`, buf.length, 'octets');
}
