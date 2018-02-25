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

var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);

var _helpers = require('./helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function signTransaction(_ref) {
  var ethLedger = _ref.ethLedger,
      kdPath = _ref.kdPath,
      txData = _ref.txData;

  if (!ethLedger || !kdPath || !txData) {
    throw Error('Invalid Params');
  }
  var eip155 = ethLedger.eip155;

  return new Promise(function (resolve, reject) {
    // TODO throw error if not sanitized...
    var sanitizedTxData = {
      to: (0, _ethereumjsUtil.addHexPrefix)(txData.to),
      nonce: (0, _ethereumjsUtil.addHexPrefix)(txData.nonce),
      gasPrice: (0, _ethereumjsUtil.addHexPrefix)(txData.gasPrice),
      value: (0, _ethereumjsUtil.addHexPrefix)(txData.value),
      data: (0, _ethereumjsUtil.addHexPrefix)(txData.data),
      gas: (0, _ethereumjsUtil.addHexPrefix)(txData.gas)
    };

    var _ref2 = new _ethereumjsTx2.default(sanitizedTxData),
        raw = _ref2.raw;
    // TODO confirm if this is correct...
    // set the chain ID if it's passed


    raw[6] = Buffer.from([txData.chainId || 1]);
    raw[7] = 0;
    raw[8] = 0;
    // TODO, determine if this is correct....
    var rawTxToSign = eip155 ? raw : raw.slice(0, 6);
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

function signMessage(_ref3) {
  var ethLedger = _ref3.ethLedger,
      kdPath = _ref3.kdPath,
      txData = _ref3.txData;

  if (!ethLedger || !kdPath || !txData) {
    throw Error('Invalid Params');
  }
  return new Promise(function (resolve, reject) {
    var msgHash = _ethereumjsUtil2.default.sha3((0, _ethereumjsUtil.addHexPrefix)(txData));
    // console.log(msgHash);
    ethLedger.signPersonalMessage_async(kdPath, Buffer.from(msgHash).toString('hex')).then(function (result) {
      var v = result.v - 27;
      v = v.toString(16);
      if (v.length < 2) {
        v = '0' + v;
      }

      var sTx = new _ethereumjsTx2.default({
        data: Buffer.from(msgHash).toString('hex'),
        r: (0, _ethereumjsUtil.addHexPrefix)(result.r),
        s: (0, _ethereumjsUtil.addHexPrefix)(result.s),
        v: (0, _ethereumjsUtil.addHexPrefix)(result.v)
      });
      // sanity check
      var sender = sTx.getSenderAddress().toString('hex');
      if (txData.from && (0, _helpers.sanitizeAddress)(sender) !== (0, _helpers.sanitizeAddress)(txData.from)) {
        return reject('Signing address does not match sender');
      }
      console.log('tx sender', sender);
      // format the signed transaction for web3
      var signedTx = (0, _ethereumjsUtil.addHexPrefix)(sTx.serialize().toString('hex'));

      var ecrec = (0, _ethereumjsUtil.ecrecover)(msgHash, result.v, result.r, result.s);
      var addrBuff = (0, _ethereumjsUtil.publicToAddress)(ecrec);
      var addr = (0, _ethereumjsUtil.bufferToHex)(addrBuff);
      console.log('ecrec sender', (0, _ethereumjsUtil.bufferToHex)(addr));

      var ecrec1 = (0, _ethereumjsUtil.ecrecover)(msgHash, v, result.r, result.s);
      var addrBuff1 = (0, _ethereumjsUtil.publicToAddress)(ecrec1);
      var addr1 = (0, _ethereumjsUtil.bufferToHex)(addrBuff1);
      console.log('ecrec sender v', (0, _ethereumjsUtil.bufferToHex)(addr1));

      var res = _ethereumjsUtil2.default.fromRpcSig('0x' + result.r + result.s + v);
      var rec = (0, _ethereumjsUtil.ecrecover)(_ethereumjsUtil2.default.toBuffer(msgHash), res.v, res.r, res.s);
      var buff = (0, _ethereumjsUtil.publicToAddress)(rec);
      var addr2 = (0, _ethereumjsUtil.bufferToHex)(buff);
      console.log('rpcsig', addr2);

      // return resolve(addr);
      return resolve(signedTx);
    }).fail(reject);
  });
}

// export function signMessage({ ethLedger, kdPath, txData }) {
//   if (!ethLedger || !kdPath || !txData) {
//     throw Error('Invalid Params');
//   }
//   const { eip155 } = ethLedger;
//   return new Promise((resolve, reject) => {
//     // TODO throw error if not sanitized...
//     const sanitizedTxData = {
//       to: '0x0000000000000000000000000000000000000000',
//       nonce: '0x00',
//       gasPrice: '0x00',
//       value: '0x00',
//       data: addHexPrefix(txData),
//       gas: '0x00',
//     };
//     const { raw } = new EthTx(sanitizedTxData);
//     // TODO confirm if this is correct...
//     // set the chain ID if it's passed
//     raw[6] = Buffer.from([txData.chainId || 1]);
//     raw[7] = 0;
//     raw[8] = 0;
//     // TODO, determine if this is correct....
//     const rawTxToSign = eip155 ? raw : raw.slice(0, 6);
//     const rawHash = rlp.encode(rawTxToSign).toString('hex');
//     // sign the transaction
//     ethLedger
//       .signTransaction_async(kdPath, rawHash)
//       .then(result => {
//         // sign the transaction with the r,s,v
//         const sTx = new EthTx({
//           ...sanitizedTxData,
//           r: addHexPrefix(result.r),
//           s: addHexPrefix(result.s),
//           v: addHexPrefix(result.v),
//         });
//         // sanity check
//         const sender = sTx.getSenderAddress().toString('hex');
//         if (txData.from && sanitizeAddress(sender) !== sanitizeAddress(txData.from)) {
//           return reject('Signing address does not match sender');
//         }
//         // format the signed transaction for web3
//         const signedTx = addHexPrefix(sTx.serialize().toString('hex'));
//         return resolve(signedTx);
//       })
//       .fail(reject);
//   });
// }