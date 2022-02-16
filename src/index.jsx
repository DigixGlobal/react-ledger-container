import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import AppEth from "@ledgerhq/hw-app-eth";

import { signTransaction, signMessage } from './signing';
import { sanitizeAddress } from './helpers';
import {
  DEFAULT_KD_PATH,
  TIMEOUT_DEFAULT,
  TIMEOUT_SIGNING,
  POLL_CONNECTED,
  POLL_DISCONNECTED,
} from './constants';

export default class LedgerContainer extends Component {
  constructor(props) {
    super(props);

    this.handleSignMessage = this.handleSignMessage.bind(this);
    this.handleSignTransaction = this.handleSignTransaction.bind(this);
    this.handleInitiateSigning = this.handleInitiateSigning.bind(this);

    this.initializeManually = props.renderInitSigning !== undefined;
    this.timeout = undefined;
    this.pollingStopped = false;

    this.STATUS = {
      initSigning: 1,
      loading: 2,
      readyForSigning: 3,
      error: 4,
    };

    this.state = {
      error: false,
      ready: false,
      config: null,
      status: this.initializeManually ? this.STATUS.initSigning : undefined,
    };
  }

  componentDidMount() {
    if (!this.initializeManually) {
      this.startPolling();
    }
  }

  componentWillUnmount() {
    this.stopPolling();
  }

  getChildProps() {
    return {
      ethLedger: this.ethLedger,
      config: this.state.config,
      initiateSigning: this.handleInitiateSigning,
      signTransaction: this.handleSignTransaction,
      signMessage: this.handleSignMessage,
    };
  }

  getStatus() {
    const { expect } = this.props;
    const { kdPath, address } = expect || {};

    return new Promise((resolve, reject) => {
      this.initLedger()
        .then(() => {
          try {
            this.ethLedger
              .getAddress(kdPath || `${DEFAULT_KD_PATH}0`)
              .then(result => {
                if (address && sanitizeAddress(result.address) !== sanitizeAddress(address)) {
                  return reject({ notExpected: true });
                }
                return resolve();
              })
              .catch(reject);
          } catch (err) {
            reject(err);
          }
        })
        .catch(reject);
    })
      .then(() => {
        // only trigger `ready` if it's a new non-error...
        if (!this.isReadyForSigning()) {
          this.setState({
            error: false,
            ready: true,
            status: this.STATUS.readyForSigning,
          }, () => {
            this.handleOnReady();
          });
        }
      })
      .catch(error => this.setState({
        error,
        ready: false,
        status: this.STATUS.error,
      }));
  }

  initLedger() {
    return new Promise((resolve, reject) => {
        if (this.ethLedger) {
            resolve(this.ethLedger);
            return;
        }

        TransportWebHID.create()
            .then(transport => {
                const ethLedger = new AppEth(transport);

                ethLedger.getAppConfiguration()
                    .then(config => {
                        // detect eip155 support
                        const version = config.version && config.version.split('.').map(n => parseInt(n, 10));
                        const eip155 = version && (version[0] > 1 || version[1] > 0 || version[2] > 2);
                        ethLedger.eip155 = eip155;

                        this.ethLedger = ethLedger;
                        this.setState({
                            config: { ...config, eip155 },
                        });
                        resolve();
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
  }

  isReadyForSigning() {
    const { ready, status } = this.state;

    if (this.initializeManually) {
      return status === this.STATUS.readyForSigning;
    }

    return ready;
  }

  startPolling() {
    this.pollingStopped = false;
    const poll = () => {
      if (this.pollingStopped) {
        return null;
      }

      const timer = () => {
        if (this.pollingStopped) {
          return null;
        }

        // reduce poll speed if we are connected
        const pollSpeed = this.isReadyForSigning() ? POLL_CONNECTED : POLL_DISCONNECTED;
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

  handleInitiateSigning() {
    this.setState({ status: this.STATUS.loading });
    this.startPolling();
  }

  handleSignTransaction(kdPath, txData) {
    const { ethLedger } = this;
    return this.pausePollingForPromise(() => signTransaction({ ethLedger, kdPath, txData }));
  }

  handleSignMessage(kdPath, txData) {
    const { ethLedger } = this;
    return this.pausePollingForPromise(() => signMessage({ ethLedger, kdPath, txData }));
  }

  pausePollingForPromise(promise) {
    const { ethLedger } = this;
    this.stopPolling();

    return promise()
      .then(result => {
        this.startPolling();
        return result;
      })
      .catch(error => {
        this.startPolling();
        throw error;
      });
  }

  renderLoading() {
    if (this.props.renderLoading) {
      return this.props.renderLoading();
    }

    return (
      <div>
        Please use Chrome, Opera or Firefox with a U2F extension.
        After connecting your Ledger, open the Ethereum app and make sure <i>Contract Data</i>
        is enabled in <i>Settings</i>. If there is a setting for <i>Broswer Mode</i> (for old
        firmware versions), you need to enable it as well.
      </div>
    );
  }

  renderError() {
    const { error } = this.state;
    const message = (
      <div>
        Please use Chrome, Opera or Firefox with a U2F extension.
        After connecting your Ledger, open the Ethereum app and make sure <i>Contract Data</i>
        is enabled in <i>Settings</i>. If there is a setting for <i>Broswer Mode</i> (for old
        firmware versions), you need to enable it as well.
      </div>
    );

    if (this.props.renderError) {
      return this.props.renderError({ error });
    }

    const { errorCode, notExpected } = error;
    if (notExpected) {
      return <span>Address mismatch!</span>;
    } else if (errorCode && errorCode === 2) {
      return <span>U2F is only supported via https://</span>;
    }

    return message;
  }

  renderReady() {
    return this.props.renderReady(this.getChildProps());
  }

  renderInitSigning() {
    return this.props.renderInitSigning(this.getChildProps());
  }

  render() {
    const { ready, error, status } = this.state;

    if (this.initializeManually) {
      switch (status) {
        case this.STATUS.loading:
          return this.renderLoading();
        case this.STATUS.initSigning:
          return this.renderInitSigning();
        case this.STATUS.readyForSigning:
          return this.renderReady();
        case this.STATUS.error:
          return this.renderError();
        default:
          return this.renderLoading();
      }
    }

    if (ready) {
      return this.renderReady();
    }

    if (error) {
      return this.renderError();
    }

    return this.renderLoading();
  }
}

const { func, shape, string } = PropTypes;
LedgerContainer.propTypes = {
  renderError: func,
  renderInitSigning: func,
  renderLoading: func,
  renderReady: func.isRequired,
  onReady: func,
  expect: shape({
    kdPath: string,
    address: string,
  }),
};

LedgerContainer.defaultProps = {
  renderError: undefined,
  renderInitSigning: undefined,
  renderLoading: undefined,
  onReady: undefined,
  expect: undefined,
};
