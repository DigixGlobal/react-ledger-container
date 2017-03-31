'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.signTransaction = signTransaction;
exports.signMessage = signMessage;

var _ethereumjsTx = require('ethereumjs-tx');

var _ethereumjsTx2 = _interopRequireDefault(_ethereumjsTx);

var _ethereumjsUtil = require('ethereumjs-util');

var _helpers = require('./helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function signTransaction(_ref) {
  var ethLedger = _ref.ethLedger,
      kdPath = _ref.kdPath,
      txData = _ref.txData;

  if (!ethLedger || !kdPath || !txData) {
    throw Error('Invalid Params');
  }
  return new Promise(function (resolve, reject) {
    // TODO throw error if not sanitized...
    var sanitizedTxData = {
      to: (0, _ethereumjsUtil.addHexPrefix)(txData.to),
      nonce: (0, _ethereumjsUtil.addHexPrefix)(txData.nonce),
      gasPrice: (0, _ethereumjsUtil.addHexPrefix)(txData.gasPrice),
      value: (0, _ethereumjsUtil.addHexPrefix)(txData.value),
      data: (0, _ethereumjsUtil.addHexPrefix)(txData.data),
      // bump gas amount slightly (nano adds this?)
      gas: (0, _helpers.addToHex)(txData.gas, 21000)
    };

    var _ref2 = new _ethereumjsTx2.default(sanitizedTxData),
        raw = _ref2.raw;
    // set the chain ID if it's passed


    raw[6] = Buffer.from([txData.chainId || 1]);
    raw[7] = 0;
    raw[8] = 0;
    // if it's the old version, disable eip
    var rawTxToSign = ethLedger.eip155 ? raw : raw.slice(0, 6);
    var rawHash = _ethereumjsUtil.rlp.encode(rawTxToSign).toString('hex');
    // sign the transaction
    ethLedger.signTransaction_async(kdPath, rawHash).then(function (result) {
      // sign the transaction with the r,s,v
      var sTx = new _ethereumjsTx2.default(_extends({}, sanitizedTxData, {
        r: (0, _ethereumjsUtil.addHexPrefix)(result.r),
        s: (0, _ethereumjsUtil.addHexPrefix)(result.s),
        v: (0, _ethereumjsUtil.addHexPrefix)(result.v)
      }));
      // sanity check
      var sender = sTx.getSenderAddress().toString('hex');
      if (txData.from && (0, _helpers.sanitizeAddress)(sender) !== (0, _helpers.sanitizeAddress)(txData.from)) {
        return reject('Signing address does not match sender');
      }
      // format the signed transaction for web3
      var signedTx = (0, _ethereumjsUtil.addHexPrefix)(sTx.serialize().toString('hex'));
      return resolve(signedTx);
    }).fail(reject);
  });
}

function signMessage() {
  // TODO sign message
}