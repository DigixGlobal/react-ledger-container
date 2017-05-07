# React Ledger Container (WIP)

⚠️  Works with the 1.2+ Ledger firmware. **EIP155 Replay protection only works with 1.3+**

❗️ Use with cation; Developer accepts no liability for loss of funds!

### React component that implements the [Ledger Wallet API](https://github.com/LedgerHQ/ledger-node-js-api).

## Features

* Ledger Wallet config automatically passed as props
  * `version`
  * `arbitraryDataEnabled`
  * `eip155`
* Auto-configured `ethLedger` methods injection
  * `signTransaction`
  * `getAddress` (TODO)
  * `signPersonalMessage` (TODO)
* More convenient API
  * Pass transaction object rather than rawTx (and handle compatibility)
  * Automatically self-configures raw transaction data based on device version
  * Polls for connectivity, with intelligent poll times for enhanced UX
* `expect` option for validating address
* `onReady` event handler for triggering actions

## Example

```javascript
import React, { PropTypes, Component } from 'react';
import LedgerContianer from '@digix/react-ledger-container';

export default class SignLedgerTransaction extends Component {
  constructor(props) {
    super(props);
    this.handleSign = this.handleSign.bind(this);
  }
  handleSign({ signTransaction }) {
    // txData = { to, nonce, gasPrice, value, data, gas } (w/ optional `from` for validating)
    const { txData, account, publishTransaction } = this.props;
    // kdPath = "44'/60'/0'/0";
    const { kdPath } = account;
    // signTransaction method will show the signing UI on ledger screen
    signTransaction(kdPath, txData).then((signedTx) => {
      publishTransaction({ signedTx });
    })
  }
  render() {
    const { kdPath, address } = this.props.account;
    return (
      <LedgerContianer
        expect={{ kdPath, address }}
        onReady={this.handleSign}
        renderReady={({ config }) => <p>Ready to sign! Using ledger version {config.version}.</p>}
      />
    );
  }
}

SignLedgerTransaction.propTypes = {
  publishTransaction: PropTypes.func.isRequired,
  account: PropTypes.object.isRequired,
  txData: PropTypes.object.isRequired,
};
```

## TODO

* Test with new version of Ledger firmware
* `getAddress` & `signPersonalMessage`
* Support for Bitcoin API
