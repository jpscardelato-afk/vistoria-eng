/* =====================================================================
   zip.js :: gravador e leitor ZIP em JavaScript puro (sem dependências)
   - Grava com método STORE (0) — fotos JPEG já são comprimidas.
   - Lê entradas STORE (0) e DEFLATE (8, via DecompressionStream).
   ===================================================================== */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(d) {
  const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
  const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
  return { time, date };
}

async function toU8(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  return new TextEncoder().encode(String(data));
}

/**
 * files: [{ name: 'pasta/arquivo.txt', data: Blob|Uint8Array|string }]
 * retorna Blob (application/zip)
 */
async function criarZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const content = await toU8(f.data);
    const crc = crc32(content);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0x0800, true);       // flag: UTF-8
    lv.setUint16(8, 0, true);            // method STORE
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, content.length, true);
    lv.setUint32(22, content.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, content);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, content.length, true);
    cv.setUint32(24, content.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += local.length + content.length;
  }

  let cdSize = 0;
  central.forEach(c => cdSize += c.length);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  return new Blob(chunks.concat(central, [end]), { type: 'application/zip' });
}

async function inflateRaw(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Navegador sem suporte a DecompressionStream (deflate).');
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([u8]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Lê um ZIP (Blob/ArrayBuffer) → [{name, data:Uint8Array}] */
async function lerZip(blob) {
  const buf = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);

  // localizar End of Central Directory
  let eocd = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 66000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Arquivo ZIP inválido.');

  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  const dec = new TextDecoder('utf-8');

  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));

    const lNameLen = dv.getUint16(localOff + 26, true);
    const lExtraLen = dv.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    let data = u8.subarray(dataStart, dataStart + compSize);
    if (method === 8) data = await inflateRaw(data);
    else if (method !== 0) throw new Error('Método de compressão não suportado no ZIP: ' + method);

    out.push({ name, data });
    p += 46 + nameLen + extraLen + commLen;
  }
  return out;
}

window.PERICIA_ZIP = { criarZip, lerZip, crc32 };
