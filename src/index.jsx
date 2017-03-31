/* eslint-disable no-param-reassign, new-cap, react/require-default-props */

import React, { PropTypes, Component } from 'react';
import ledgerco from 'ledgerco';
import u2f from 'ledgerco/browser/u2f-api';

import { signTransaction } from './signing';
import { sanitizeAddress } from './helpers';

import {
  DEFAULT_KD_PATH,
  TIMEOUT_DEFAULT,
  TIMEOUT_SIGNING,
  POLL_CONNECTED,
  POLL_DISCONNECTED,
} from './constants';

global.u2f = u2f;

export default class LedgerContianer extends Component {
  constructor(props) {
    super(props);
    this.state = { error: false, ready: false, config: null };
    this.handleSignTransaction = this.handleSignTransaction.bind(this);
  }
  componentDidMount() {
    this.startPolling();
  }
  componentWillUnmount() {
    this.stopPolling();
  }
  getChildProps() {
    return {
      config: this.state.config,
      signTransaction: this.handleSignTransaction,
      // TODO signMessage
    };
  }
  getStatus() {
    const { expect } = this.props;
    const { kdPath, address } = expect || {};
    return new Promise((resolve, reject) => {
      this.initLedger().then(() => {
        try {
          this.ethLedger.getAddress_async(kdPath || `${DEFAULT_KD_PATH}0`).then((result) => {
            if (address && sanitizeAddress(result.address) !== sanitizeAddress(address)) {
              return reject({ notExpected: true });
            }
            return resolve();
          }).fail(reject);
        } catch (err) {
          reject(err);
        }
      }).catch(reject);
    })
    .then(() => {
      // only trigger `ready` if it's a new non-error...
      if (!this.state.ready) {
        this.setState({ error: false, ready: true });
        this.handleOnReady();
      }
    })
    .catch(error => this.setState({ error, ready: false }));
  }
  initLedger() {
    return new Promise((resolve, reject) => {
      if (this.ethLedger) { resolve(this.ethLedger); return; }
      ledgerco.comm_u2f.create_async().then((comm) => {
        comm.timeoutSeconds = TIMEOUT_DEFAULT;
        this.ethLedger = new ledgerco.eth(comm);
        this.ethLedger.getAppConfiguration_async().then((config) => {
          // TODO check for EIP155 support
          this.setState({ config });
          resolve();
        }).fail(reject);
      }).fail(reject);
    });
  }
  startPolling() {
    this.pollingStopped = false;
    const poll = () => {
      if (this.pollingStopped) { return null; }
      const timer = () => {
        if (this.pollingStopped) { return null; }
        // reduce poll speed if we are connected
        const pollSpeed = this.state.ready ? POLL_CONNECTED : POLL_DISCONNECTED;
        this.timeout = setTimeout(poll, pollSpeed);
        return null;
      };
      return this.getStatus()
      .then(timer)
      .catch(timer);
    };
    poll();
  }
  stopPolling() {
    clearTimeout(this.timeout);
    this.pollingStopped = true;
  }
  handleOnReady() {
    if (this.props.onReady) {
      this.props.onReady(this.getChildProps());
    }
  }
  handleSignTransaction(kdPath, txData) {
    const { ethLedger } = this;
    return this.pausePollingForPromise(() => signTransaction({ ethLedger, kdPath, txData }));
  }
  pausePollingForPromise(promise) {
    const { ethLedger } = this;
    ethLedger.comm.timeoutSeconds = TIMEOUT_SIGNING;
    this.stopPolling();
    return promise()
    .then((result) => {
      ethLedger.comm.timeoutSeconds = TIMEOUT_DEFAULT;
      this.startPolling();
      return result;
    }).catch((error) => {
      ethLedger.comm.timeoutSeconds = TIMEOUT_DEFAULT;
      this.startPolling();
      throw error;
    });
  }
  renderLoading() {
    if (this.props.renderLoading) { return this.props.renderLoading(); }
    return <span>Loading</span>;
  }
  renderError() {
    const { error } = this.state;
    if (this.props.renderError) { return this.props.renderError({ error }); }
    const { errorCode, notExpected } = error;
    if (notExpected) {
      return <span>Address mismatch!</span>;
    }
    if (errorCode && errorCode === 2) {
      return <span>U2F is only supported via https://</span>;
    }
    if (errorCode && errorCode === 5) {
      return <span>Open app on Ledger Wallet and ensure <i>Browser Mode</i> is enabled.</span>;
    }
    return <span>Error: {JSON.stringify(error)}</span>;
  }
  renderReady() {
    return this.props.renderReady(this.getChildProps());
  }
  render() {
    const { ready, error } = this.state;
    if (ready) { return this.renderReady(); }
    if (error) { return this.renderError(); }
    return this.renderLoading();
  }
}

LedgerContianer.propTypes = {
  renderReady: PropTypes.func.isRequired,
  renderLoading: PropTypes.func,
  renderError: PropTypes.func,
  onReady: PropTypes.func,
  expect: PropTypes.shape({
    kdPath: PropTypes.string,
    address: PropTypes.string,
  }),
};
