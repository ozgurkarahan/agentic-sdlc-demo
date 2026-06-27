import { randomInt } from 'node:crypto';

export const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export type RandomIndex = (maxExclusive: number) => number;

function secureRandomIndex(maxExclusive: number): number {
  return randomInt(maxExclusive);
}

export function generateCode(length = 6, randomIndex: RandomIndex = secureRandomIndex): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Code length must be a positive integer');
  }

  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += BASE62_ALPHABET[randomIndex(BASE62_ALPHABET.length)];
  }
  return code;
}
