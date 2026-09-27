/**
 * Minimal, zero-dependency pure TypeScript QR Code Generator
 * Generates valid scannable QR Codes (Versions 1-6 with Byte mode and ECC Level M)
 */

type QRMatrix = boolean[][];

// Galois field tables for GF(256) with primitive polynomial 0x11d
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(function initGalois() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP_TABLE[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsComputeEcc(data: Uint8Array, numEcc: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcc);
  const res = new Uint8Array(numEcc);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[numEcc - 1] = 0;
    for (let j = 0; j < numEcc; j++) {
      res[j] ^= gfMul(gen[j], factor);
    }
  }
  return res;
}

// Version table for Level M: [version, totalCodewords, dataCodewords, eccCodewords, alignPos]
const QR_SPECS: Record<number, { size: number; total: number; data: number; ecc: number; align: number[] }> = {
  1: { size: 21, total: 26, data: 16, ecc: 10, align: [] },
  2: { size: 25, total: 44, data: 28, ecc: 16, align: [6, 18] },
  3: { size: 29, total: 70, data: 44, ecc: 26, align: [6, 22] },
  4: { size: 33, total: 100, data: 64, ecc: 36, align: [6, 26] },
  5: { size: 37, total: 134, data: 86, ecc: 48, align: [6, 30] },
  6: { size: 41, total: 172, data: 108, ecc: 64, align: [6, 34] },
};

export function generateQRCodeMatrix(text: string): QRMatrix {
  const utf8Bytes = new TextEncoder().encode(text);
  const dataLen = utf8Bytes.length;

  // Pick smallest fitting version
  let version = 1;
  while (version <= 6 && QR_SPECS[version].data - 3 < dataLen) {
    version++;
  }
  if (version > 6) version = 6;
  const spec = QR_SPECS[version];

  // 1. Bitstream assembly (Byte mode: 0100 + 8-bit length + data + terminator)
  const bits: number[] = [];
  const pushBits = (val: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(dataLen, 8); // Character count indicator
  for (let i = 0; i < dataLen; i++) {
    pushBits(utf8Bytes[i], 8);
  }
  // Terminator
  pushBits(0, Math.min(4, spec.data * 8 - bits.length));
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad codewords (0xEC, 0x11)
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < spec.data * 8) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords = new Uint8Array(spec.data);
  for (let i = 0; i < spec.data; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byteVal;
  }

  // 2. Error Correction
  const eccCodewords = rsComputeEcc(dataCodewords, spec.ecc);

  // Concatenate data + ecc
  const allCodewords = new Uint8Array(spec.total);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(eccCodewords, spec.data);

  // 3. Grid allocation
  const size = spec.size;
  const matrix: QRMatrix = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean, isFunc = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (isFunc) isFunction[r][c] = true;
    }
  };

  // Finder Patterns
  const addFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
        const isRing = r === 0 || r === 6 || c === 0 || c === 6;
        const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(nr, nc, !isBorder && (isRing || isCore));
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // Alignment Patterns (for versions >= 2)
  if (spec.align.length >= 2) {
    const coords = spec.align;
    for (const r of coords) {
      for (const c of coords) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBox = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBox || isCenter);
          }
        }
      }
    }
  }

  // Dark module
  setModule(4 * version + 9, 8, true);

  // Reserve Format bits
  for (let i = 0; i < 9; i++) {
    setModule(8, i, false);
    setModule(i, 8, false);
    setModule(8, size - 1 - i, false);
    setModule(size - 1 - i, 8, false);
  }
  setModule(8, 8, false);

  // 4. Data placement (zigzag right to left, up and down)
  let bitIndex = 0;
  const totalBits = spec.total * 8;
  const allBits: number[] = [];
  for (let i = 0; i < spec.total; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((allCodewords[i] >> b) & 1);
    }
  }

  let upward = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [rightCol, rightCol - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIndex < totalBits ? allBits[bitIndex] : 0;
          bitIndex++;
          // Standard mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  // 5. Format info (Mask 0, ECC M: 101010000010010)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 0; i < 6; i++) matrix[5 - i][8] = formatBits[9 + i] === 1;

  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = formatBits[7 + i] === 1;

  return matrix;
}
