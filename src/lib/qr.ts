/**
 * Zero-dependency ISO/IEC 18004 compliant QR Code Generator (TypeScript)
 * Supports Versions 1–10 (Byte mode, ECC Level M) with full multi-block
 * Reed-Solomon error correction and codeword interleaving.
 */

type QRMatrix = boolean[][];

// Galois field tables for GF(256) with primitive polynomial 0x11d (285)
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

interface QRVersionSpec {
  size: number;
  totalData: number;
  eccPerBlock: number;
  numBlocksGroup1: number;
  dataPerBlockGroup1: number;
  numBlocksGroup2: number;
  dataPerBlockGroup2: number;
  align: number[];
}

// ISO/IEC 18004 Table 9 & Table 13 — ECC Level M specifications (Versions 1 to 10)
const QR_SPECS: Record<number, QRVersionSpec> = {
  1: { size: 21, totalData: 16, eccPerBlock: 10, numBlocksGroup1: 1, dataPerBlockGroup1: 16, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [] },
  2: { size: 25, totalData: 28, eccPerBlock: 16, numBlocksGroup1: 1, dataPerBlockGroup1: 28, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [6, 18] },
  3: { size: 29, totalData: 44, eccPerBlock: 26, numBlocksGroup1: 1, dataPerBlockGroup1: 44, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [6, 22] },
  4: { size: 33, totalData: 64, eccPerBlock: 18, numBlocksGroup1: 2, dataPerBlockGroup1: 32, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [6, 26] },
  5: { size: 37, totalData: 86, eccPerBlock: 24, numBlocksGroup1: 2, dataPerBlockGroup1: 43, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [6, 30] },
  6: { size: 41, totalData: 108, eccPerBlock: 16, numBlocksGroup1: 4, dataPerBlockGroup1: 27, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [6, 34] },
  7: { size: 45, totalData: 124, eccPerBlock: 18, numBlocksGroup1: 4, dataPerBlockGroup1: 31, numBlocksGroup2: 0, dataPerBlockGroup2: 0, align: [6, 22, 38] },
  8: { size: 49, totalData: 154, eccPerBlock: 22, numBlocksGroup1: 2, dataPerBlockGroup1: 38, numBlocksGroup2: 2, dataPerBlockGroup2: 39, align: [6, 24, 42] },
  9: { size: 53, totalData: 182, eccPerBlock: 22, numBlocksGroup1: 3, dataPerBlockGroup1: 36, numBlocksGroup2: 2, dataPerBlockGroup2: 37, align: [6, 26, 46] },
  10: { size: 57, totalData: 216, eccPerBlock: 26, numBlocksGroup1: 4, dataPerBlockGroup1: 43, numBlocksGroup2: 1, dataPerBlockGroup2: 44, align: [6, 28, 50] },
};

// Precompute 18-bit Version Information for Versions >= 7 (ISO/IEC 18004 Annex D)
function getVersionInfoBits(version: number): number {
  let rem = version << 12;
  const poly = 0b1111100100101;
  for (let i = 17; i >= 12; i--) {
    if (rem & (1 << i)) {
      rem ^= poly << (i - 12);
    }
  }
  return (version << 12) | rem;
}

// Compute 15-bit Format Information for ECC Level M (00) + given mask (0..7)
function getFormatInfoBits(mask: number): number {
  const data = (0b00 << 3) | mask; // 00 = Level M
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if (rem & (1 << i)) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

export function generateQRCodeMatrix(text: string): QRMatrix {
  const utf8Bytes = new TextEncoder().encode(text);
  const dataLen = utf8Bytes.length;

  // 1. Pick smallest fitting version (Versions 1–9 use 8-bit length in Byte mode; Version 10 uses 16-bit)
  let version = 1;
  while (version <= 10) {
    const headerBytes = version <= 9 ? 2 : 3; // 4-bit mode + 8/16-bit length + 4-bit terminator
    if (QR_SPECS[version].totalData >= dataLen + headerBytes) {
      break;
    }
    version++;
  }
  if (version > 10) version = 10;
  const spec = QR_SPECS[version];

  // 2. Assemble bitstream (Byte mode: 0100 + char count + data + terminator + pad)
  const bits: number[] = [];
  const pushBits = (val: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(dataLen, version <= 9 ? 8 : 16); // Character count indicator
  for (let i = 0; i < dataLen; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const maxDataBits = spec.totalData * 8;
  pushBits(0, Math.min(4, maxDataBits - bits.length));

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad remaining codewords with alternating 0xEC, 0x11
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxDataBits) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords = new Uint8Array(spec.totalData);
  for (let i = 0; i < spec.totalData; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byteVal;
  }

  // 3. Split into blocks, compute Reed-Solomon ECC per block, and interleave!
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let b = 0; b < spec.numBlocksGroup1; b++) {
    const block = dataCodewords.slice(offset, offset + spec.dataPerBlockGroup1);
    offset += spec.dataPerBlockGroup1;
    dataBlocks.push(block);
    eccBlocks.push(rsComputeEcc(block, spec.eccPerBlock));
  }

  for (let b = 0; b < spec.numBlocksGroup2; b++) {
    const block = dataCodewords.slice(offset, offset + spec.dataPerBlockGroup2);
    offset += spec.dataPerBlockGroup2;
    dataBlocks.push(block);
    eccBlocks.push(rsComputeEcc(block, spec.eccPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataBlockLen = Math.max(spec.dataPerBlockGroup1, spec.dataPerBlockGroup2);
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (i < dataBlocks[b].length) {
        interleaved.push(dataBlocks[b][i]);
      }
    }
  }
  for (let i = 0; i < spec.eccPerBlock; i++) {
    for (let b = 0; b < eccBlocks.length; b++) {
      interleaved.push(eccBlocks[b][i]);
    }
  }

  // 4. Allocate matrix and place function patterns
  const size = spec.size;
  const matrix: QRMatrix = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean, isFunc = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (isFunc) isFunction[r][c] = true;
    }
  };

  // Finder Patterns + 1-module White Separators
  const addFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const isSeparator = r === -1 || r === 7 || c === -1 || c === 7;
        const isRing = r === 0 || r === 6 || c === 0 || c === 6;
        const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(nr, nc, !isSeparator && (isRing || isCore), true);
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Alignment Patterns (placed BEFORE timing patterns so timing doesn't block alignment centers, skipping only finder overlaps)
  if (spec.align.length > 0) {
    const coords = spec.align;
    for (let i = 0; i < coords.length; i++) {
      for (let j = 0; j < coords.length; j++) {
        // Skip the 3 corners that overlap with Finder Patterns
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === coords.length - 1) ||
          (i === coords.length - 1 && j === 0)
        ) {
          continue;
        }
        const r = coords[i];
        const c = coords[j];
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBox = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBox || isCenter, true);
          }
        }
      }
    }
  }

  // Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0, true);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0, true);
  }

  // Dark Module
  setModule(4 * version + 9, 8, true, true);

  // Reserve Format Information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setModule(8, i, false, true);
    if (!isFunction[i][8]) setModule(i, 8, false, true);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setModule(8, size - 1 - i, false, true);
    if (!isFunction[size - 1 - i][8]) setModule(size - 1 - i, 8, false, true);
  }

  // Version Information (for Versions >= 7)
  if (version >= 7) {
    const vBits = getVersionInfoBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      setModule(a, b, bit, true);
      setModule(b, a, bit, true);
    }
  }

  // 5. Place interleaved data + ECC bits (zigzag right-to-left, alternating upward/downward)
  const allBits: number[] = [];
  for (let i = 0; i < interleaved.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((interleaved[i] >> b) & 1);
    }
  }

  let bitIndex = 0;
  let upward = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing line
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const c of [rightCol, rightCol - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIndex < allBits.length ? allBits[bitIndex] : 0;
          bitIndex++;
          // Mask 0: (r + c) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  // 6. Write Format Information (Mask 0, ECC Level M)
  // ISO/IEC 18004: bit 0 is LSB, bit 14 is MSB
  const fBits = getFormatInfoBits(0);
  // Top-left around finder:
  // Bits 0..5 go down col 8 at rows 0..5; bit 6 at (7,8); bit 7 at (8,8); bit 8 at (8,7); bits 9..14 at row 8 cols 5..0
  for (let i = 0; i <= 5; i++) matrix[i][8] = ((fBits >> i) & 1) === 1;
  matrix[7][8] = ((fBits >> 6) & 1) === 1;
  matrix[8][8] = ((fBits >> 7) & 1) === 1;
  matrix[8][7] = ((fBits >> 8) & 1) === 1;
  for (let i = 9; i <= 14; i++) matrix[8][14 - i] = ((fBits >> i) & 1) === 1;

  // Top-right & Bottom-left copies:
  // Bits 0..7 along row 8 from col size-1 down to size-8
  for (let i = 0; i <= 7; i++) matrix[8][size - 1 - i] = ((fBits >> i) & 1) === 1;
  // Bits 8..14 along col 8 from row size-7 up to size-1
  for (let i = 8; i <= 14; i++) matrix[size - 15 + i][8] = ((fBits >> i) & 1) === 1;

  return matrix;
}
