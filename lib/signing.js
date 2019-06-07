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

var getTransactionFields = function getTransactionFields(t) {
  var data = t.data,
      gasLimit = t.gasLimit,
      gasPrice = t.gasPrice,
      to = t.to,
      nonce = t.nonce,
      value = t.value;


  var chainId = t.getChainId();

  return {
    value: (0, _ethereumjsUtil.addHexPrefix)(value),
    data: (0, _ethereumjsUtil.addHexPrefix)(data),
    // To address is unchecksummed, which could cause mismatches in comparisons
    to: (0, _ethereumjsUtil.addHexPrefix)(to),
    // Everything else is as-is
    nonce: (0, _ethereumjsUtil.addHexPrefix)(nonce),
    gasPrice: (0, _ethereumjsUtil.addHexPrefix)(gasPrice),
    gasLimit: (0, _ethereumjsUtil.addHexPrefix)(gasLimit),
    chainId: chainId
  };
};

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
      gas: (0, _ethereumjsUtil.addHexPrefix)(txData.gas),
      chainId: txData.chainId || 1
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

var concatSig = function concatSig(signature) {
  var v = signature.v;
  var r = signature.r;
  var s = signature.s;
  r = _ethereumjsUtil2.default.fromSigned(r);
  s = _ethereumjsUtil2.default.fromSigned(s);
  v = _ethereumjsUtil2.default.bufferToInt(v);
  r = _ethereumjsUtil2.default.setLengthLeft(_ethereumjsUtil2.default.toUnsigned(r), 32).toString('hex');
  s = _ethereumjsUtil2.default.setLengthLeft(_ethereumjsUtil2.default.toUnsigned(s), 32).toString('hex');
  v = _ethereumjsUtil2.default.stripHexPrefix(_ethereumjsUtil2.default.intToHex(v));
  return _ethereumjsUtil2.default.addHexPrefix(r.concat(s, v).toString('hex'));
};

function signMessage(_ref3) {
  var ethLedger = _ref3.ethLedger,
      kdPath = _ref3.kdPath,
      txData = _ref3.txData;

  if (!ethLedger || !kdPath || !txData) {
    throw Error('Invalid Params');
  }
  return new Promise(function (resolve, reject) {
    ethLedger.signPersonalMessage_async(kdPath, Buffer.from(txData).toString('hex')).then(function (result) {
      var v = result.v - 27;
      v = v.toString(16);
      if (v.length < 2) {
        v = '0' + v;
      }
      var sig = _ethereumjsUtil2.default.fromRpcSig('0x' + result.r + result.s + v);
      var signedTx = concatSig(sig);

      // NOTE: The commented code below verifies the if the recovered addresss is similar to that of the sender
      // const recovered = util.ecrecover(
      //   util.sha3(Buffer.from(`\x19Ethereum Signed Message:\n${testData.length}${testData}`, 32)),
      //   result.v,
      //   new Buffer(result.r, 'hex'),
      //   new Buffer(result.s, 'hex')
      // );
      // console.log('recovered', util.publicToAddress(recovered).toString('hex'));
      // console.log('signedTx', signedTx, v);

      return resolve(signedTx);
    }).fail(reject);
  });
}