import EthTx from 'ethereumjs-tx';
import util, {
  rlp,
  addHexPrefix,
  ecrecover,
  publicToAddress,
  bufferToHex,
  fromRpcSig,
} from 'ethereumjs-util';

import { sanitizeAddress } from './helpers';

const getTransactionFields = t => {
  const { data, gasLimit, gasPrice, to, nonce, value } = t;

  const chainId = t.getChainId();

  return {
    value: addHexPrefix(value),
    data: addHexPrefix(data),
    // To address is unchecksummed, which could cause mismatches in comparisons
    to: addHexPrefix(to),
    // Everything else is as-is
    nonce: addHexPrefix(nonce),
    gasPrice: addHexPrefix(gasPrice),
    gasLimit: addHexPrefix(gasLimit),
    chainId,
  };
};

export function signTransaction({ ethLedger, kdPath, txData }) {
  if (!ethLedger || !kdPath || !txData) {
    throw Error('Invalid Params');
  }
  const { eip155 } = ethLedger;
  return new Promise((resolve, reject) => {
    // TODO throw error if not sanitized...
    const sanitizedTxData = {
      to: addHexPrefix(txData.to),
      nonce: addHexPrefix(txData.nonce),
      gasPrice: addHexPrefix(txData.gasPrice),
      value: addHexPrefix(txData.value),
      data: addHexPrefix(txData.data),
      gas: addHexPrefix(txData.gas),
      chainId: txData.chainId || 1,
    };
    const { raw } = new EthTx(sanitizedTxData);
    // TODO confirm if this is correct...
    // set the chain ID if it's passed
    raw[6] = Buffer.from([txData.chainId || 1]);
    raw[7] = 0;
    raw[8] = 0;
    // TODO, determine if this is correct....
    const rawTxToSign = eip155 ? raw : raw.slice(0, 6);
    const rawHash = rlp.encode(rawTxToSign).toString('hex');
    // sign the transaction
    ethLedger
      .signTransaction(kdPath, rawHash)
      .then(result => {
        // sign the transaction with the r,s,v
        const sTx = new EthTx({
          ...sanitizedTxData,
          r: addHexPrefix(result.r),
          s: addHexPrefix(result.s),
          v: addHexPrefix(result.v),
        });
        // sanity check
        const sender = sTx.getSenderAddress().toString('hex');
        if (txData.from && sanitizeAddress(sender) !== sanitizeAddress(txData.from)) {
          return reject('Signing address does not match sender');
        }
        // format the signed transaction for web3
        const signedTx = addHexPrefix(sTx.serialize().toString('hex'));
        return resolve(signedTx);
      })
      .catch(reject);
  });
}

const concatSig = signature => {
  let v = signature.v;
  let r = signature.r;
  let s = signature.s;
  r = util.fromSigned(r);
  s = util.fromSigned(s);
  v = util.bufferToInt(v);
  r = util.setLengthLeft(util.toUnsigned(r), 32).toString('hex');
  s = util.setLengthLeft(util.toUnsigned(s), 32).toString('hex');
  v = util.stripHexPrefix(util.intToHex(v));
  return util.addHexPrefix(r.concat(s, v).toString('hex'));
};

export function signMessage({ ethLedger, kdPath, txData }) {
  if (!ethLedger || !kdPath || !txData) {
    throw Error('Invalid Params');
  }
  return new Promise((resolve, reject) => {
    ethLedger
      .signPersonalMessage(kdPath, Buffer.from(txData).toString('hex'))
      .then(result => {
        let v = result.v - 27;
        v = v.toString(16);
        if (v.length < 2) {
          v = `0${v}`;
        }
        const sig = util.fromRpcSig(`0x${result.r}${result.s}${v}`);
        const signedTx = concatSig(sig);

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
      })
      .catch(reject);
  });
}
