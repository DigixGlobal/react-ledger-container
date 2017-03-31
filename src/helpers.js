import { BN, addHexPrefix, stripHexPrefix } from 'ethereumjs-util';

export function addToHex(hex, value) {
  return addHexPrefix(new BN(stripHexPrefix(hex), 16).add(new BN(value, 10)).toString('hex'));
}

export function sanitizeAddress(address) {
  return addHexPrefix(address).toLowerCase();
}
