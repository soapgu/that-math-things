export function assertMultiplicationCoordinate(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || a > 9 || b < 1 || b > 9) {
    throw new RangeError('乘法格坐标必须是 1–9 的整数');
  }
}

export function getCellKey(a, b) {
  assertMultiplicationCoordinate(a, b);
  return `${a}×${b}`;
}

export function getProduct(a, b) {
  assertMultiplicationCoordinate(a, b);
  return a * b;
}
