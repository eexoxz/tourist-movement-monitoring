const QR_VERSION = 4;
const QR_SIZE = QR_VERSION * 4 + 17;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;
const FORMAT_MASK = 0x5412;

type QrMatrix = {
  modules: boolean[][];
  size: number;
};

function utf8Bytes(value: string) {
  return Array.from(new TextEncoder().encode(value));
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1);
  }
}

function toDataCodewords(payload: string) {
  const bytes = utf8Bytes(payload);

  if (bytes.length > 78) {
    throw new Error("QR payload is too long for the tourist pass.");
  }

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const remainingBits = DATA_CODEWORDS * 8 - bits.length;
  appendBits(bits, 0, Math.min(4, remainingBits));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(Number.parseInt(bits.slice(index, index + 8).join(""), 2));
  }

  for (let padIndex = 0; codewords.length < DATA_CODEWORDS; padIndex += 1) {
    codewords.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }

  return codewords;
}

function gfMultiply(left: number, right: number) {
  let product = 0;
  let a = left;
  let b = right;

  while (b > 0) {
    if ((b & 1) !== 0) {
      product ^= a;
    }

    a <<= 1;
    if ((a & 0x100) !== 0) {
      a ^= 0x11d;
    }
    b >>>= 1;
  }

  return product & 0xff;
}

function reedSolomonGenerator(degree: number) {
  const coefficients = new Array(degree).fill(0);
  coefficients[degree - 1] = 1;
  let root = 1;

  for (let degreeIndex = 0; degreeIndex < degree; degreeIndex += 1) {
    for (let coefficientIndex = 0; coefficientIndex < degree; coefficientIndex += 1) {
      coefficients[coefficientIndex] = gfMultiply(coefficients[coefficientIndex], root);

      if (coefficientIndex + 1 < degree) {
        coefficients[coefficientIndex] ^= coefficients[coefficientIndex + 1];
      }
    }

    root = gfMultiply(root, 2);
  }

  return coefficients;
}

function reedSolomonRemainder(data: number[], degree: number) {
  const generator = reedSolomonGenerator(degree);
  const remainder = new Array(degree).fill(0);

  data.forEach((codeword) => {
    const factor = codeword ^ remainder.shift();
    remainder.push(0);

    for (let index = 0; index < degree; index += 1) {
      remainder[index] ^= gfMultiply(generator[index], factor);
    }
  });

  return remainder;
}

function createEmptyMatrix() {
  return {
    modules: Array.from({ length: QR_SIZE }, () => Array.from({ length: QR_SIZE }, () => false)),
    reserved: Array.from({ length: QR_SIZE }, () => Array.from({ length: QR_SIZE }, () => false)),
  };
}

function setModule(matrix: boolean[][], reserved: boolean[][], x: number, y: number, dark: boolean, isReserved = true) {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) {
    return;
  }

  matrix[y][x] = dark;
  if (isReserved) {
    reserved[y][x] = true;
  }
}

function addFinder(matrix: boolean[][], reserved: boolean[][], left: number, top: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const absoluteX = left + x;
      const absoluteY = top + y;
      const inPattern = x >= 0 && x <= 6 && y >= 0 && y <= 6;
      const dark = inPattern && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      setModule(matrix, reserved, absoluteX, absoluteY, dark);
    }
  }
}

function addAlignment(matrix: boolean[][], reserved: boolean[][], centerX: number, centerY: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setModule(matrix, reserved, centerX + x, centerY + y, distance !== 1);
    }
  }
}

function addFunctionPatterns(matrix: boolean[][], reserved: boolean[][]) {
  addFinder(matrix, reserved, 0, 0);
  addFinder(matrix, reserved, QR_SIZE - 7, 0);
  addFinder(matrix, reserved, 0, QR_SIZE - 7);
  addAlignment(matrix, reserved, 26, 26);

  for (let index = 0; index < QR_SIZE; index += 1) {
    if (!reserved[6][index]) {
      setModule(matrix, reserved, index, 6, index % 2 === 0);
    }
    if (!reserved[index][6]) {
      setModule(matrix, reserved, 6, index, index % 2 === 0);
    }
  }

  setModule(matrix, reserved, 8, QR_SIZE - 8, true);
}

function calculateFormatBits(maskPattern: number) {
  let data = (0b01 << 3) | maskPattern;
  let remainder = data << 10;

  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((remainder >>> bit) & 1) !== 0) {
      remainder ^= 0x537 << (bit - 10);
    }
  }

  return ((data << 10) | remainder) ^ FORMAT_MASK;
}

function addFormatBits(matrix: boolean[][], reserved: boolean[][], maskPattern: number) {
  const bits = calculateFormatBits(maskPattern);
  const first = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const second = [
    [QR_SIZE - 1, 8],
    [QR_SIZE - 2, 8],
    [QR_SIZE - 3, 8],
    [QR_SIZE - 4, 8],
    [QR_SIZE - 5, 8],
    [QR_SIZE - 6, 8],
    [QR_SIZE - 7, 8],
    [8, QR_SIZE - 8],
    [8, QR_SIZE - 7],
    [8, QR_SIZE - 6],
    [8, QR_SIZE - 5],
    [8, QR_SIZE - 4],
    [8, QR_SIZE - 3],
    [8, QR_SIZE - 2],
    [8, QR_SIZE - 1],
  ];

  first.forEach(([x, y], index) => setModule(matrix, reserved, x, y, ((bits >>> index) & 1) !== 0));
  second.forEach(([x, y], index) => setModule(matrix, reserved, x, y, ((bits >>> index) & 1) !== 0));
}

function maskBit(maskPattern: number, x: number, y: number) {
  if (maskPattern === 0) {
    return (x + y) % 2 === 0;
  }

  return false;
}

export function createQrMatrix(payload: string): QrMatrix {
  const { modules, reserved } = createEmptyMatrix();
  const data = toDataCodewords(payload);
  const codewords = [...data, ...reedSolomonRemainder(data, ECC_CODEWORDS)];
  const bits = codewords.flatMap((codeword) => Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1));
  let bitIndex = 0;

  addFunctionPatterns(modules, reserved);

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }

    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = ((QR_SIZE - 1 - right) / 2) % 2 === 0 ? QR_SIZE - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (reserved[y][x]) {
          continue;
        }

        const dark = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        modules[y][x] = dark !== maskBit(0, x, y);
        bitIndex += 1;
      }
    }
  }

  addFormatBits(modules, reserved, 0);
  return { modules, size: QR_SIZE };
}

export function createQrSvgDataUri(payload: string) {
  const quietZone = 4;
  const { modules, size } = createQrMatrix(payload);
  const viewBoxSize = size + quietZone * 2;
  const cells = modules
    .flatMap((row, y) => row.map((dark, x) => (dark ? `<rect x="${x + quietZone}" y="${y + quietZone}" width="1" height="1"/>` : "")))
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#fff"/><g fill="#0f766e">${cells}</g></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
