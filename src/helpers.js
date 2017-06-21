import { addHexPrefix } from 'ethereumjs-util';

export function sanitizeAddress(address) {
  return addHexPrefix(address).toLowerCase();
}
