'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addToHex = addToHex;
exports.sanitizeAddress = sanitizeAddress;

var _ethereumjsUtil = require('ethereumjs-util');

function addToHex(hex, value) {
  return (0, _ethereumjsUtil.addHexPrefix)(new _ethereumjsUtil.BN((0, _ethereumjsUtil.stripHexPrefix)(hex), 16).add(new _ethereumjsUtil.BN(value, 10)).toString('hex'));
}

function sanitizeAddress(address) {
  return (0, _ethereumjsUtil.addHexPrefix)(address).toLowerCase();
}