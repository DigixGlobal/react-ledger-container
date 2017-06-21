import EthTx from 'ethereumjs-tx';
import { rlp, addHexPrefix } from 'ethereumjs-util';

import { sanitizeAddress } from './helpers';

export function signTransaction({ ethLedger, kdPath, txData }) {
  if (!ethLedger || !kdPath || !txData) { throw Error('Invalid Params'); }
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
    ethLedger.signTransaction_async(kdPath, rawHash)
    .then((result) => {
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
    .fail(reject);
  });
}

export function signMessage() {
  // TODO sign message
}
