'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sanitizeAddress = sanitizeAddress;

var _ethereumjsUtil = require('ethereumjs-util');

function sanitizeAddress(address) {
  return (0, _ethereumjsUtil.addHexPrefix)(address).toLowerCase();
}