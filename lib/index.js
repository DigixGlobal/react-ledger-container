'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _hwTransportWebhid = require('@ledgerhq/hw-transport-webhid');

var _hwTransportWebhid2 = _interopRequireDefault(_hwTransportWebhid);

var _hwAppEth = require('@ledgerhq/hw-app-eth');

var _hwAppEth2 = _interopRequireDefault(_hwAppEth);

var _signing = require('./signing');

var _helpers = require('./helpers');

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LedgerContainer = function (_Component) {
  _inherits(LedgerContainer, _Component);

  function LedgerContainer(props) {
    _classCallCheck(this, LedgerContainer);

    var _this = _possibleConstructorReturn(this, (LedgerContainer.__proto__ || Object.getPrototypeOf(LedgerContainer)).call(this, props));

    _this.handleSignMessage = _this.handleSignMessage.bind(_this);
    _this.handleSignTransaction = _this.handleSignTransaction.bind(_this);
    _this.handleInitiateSigning = _this.handleInitiateSigning.bind(_this);

    _this.initializeManually = props.renderInitSigning !== undefined;
    _this.timeout = undefined;
    _this.pollingStopped = false;

    _this.STATUS = {
      initSigning: 1,
      loading: 2,
      readyForSigning: 3,
      error: 4
    };

    _this.state = {
      error: false,
      ready: false,
      config: null,
      status: _this.initializeManually ? _this.STATUS.initSigning : undefined
    };
    return _this;
  }

  _createClass(LedgerContainer, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      if (!this.initializeManually) {
        this.startPolling();
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.stopPolling();
    }
  }, {
    key: 'getChildProps',
    value: function getChildProps() {
      return {
        ethLedger: this.ethLedger,
        config: this.state.config,
        initiateSigning: this.handleInitiateSigning,
        signTransaction: this.handleSignTransaction,
        signMessage: this.handleSignMessage
      };
    }
  }, {
    key: 'getStatus',
    value: function getStatus() {
      var _this2 = this;

      var expect = this.props.expect;

      var _ref = expect || {},
          kdPath = _ref.kdPath,
          address = _ref.address;

      return new Promise(function (resolve, reject) {
        _this2.initLedger().then(function () {
          try {
            _this2.ethLedger.getAddress(kdPath || _constants.DEFAULT_KD_PATH + '0').then(function (result) {
              if (address && (0, _helpers.sanitizeAddress)(result.address) !== (0, _helpers.sanitizeAddress)(address)) {
                return reject({ notExpected: true });
              }
              return resolve();
            }).catch(reject);
          } catch (err) {
            reject(err);
          }
        }).catch(reject);
      }).then(function () {
        // only trigger `ready` if it's a new non-error...
        if (!_this2.isReadyForSigning()) {
          _this2.setState({
            error: false,
            ready: true,
            status: _this2.STATUS.readyForSigning
          }, function () {
            _this2.handleOnReady();
          });
        }
      }).catch(function (error) {
        return _this2.setState({
          error: error,
          ready: false,
          status: _this2.STATUS.error
        });
      });
    }
  }, {
    key: 'initLedger',
    value: function initLedger() {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        if (_this3.ethLedger) {
          resolve(_this3.ethLedger);
          return;
        }

        _hwTransportWebhid2.default.create().then(function (transport) {
          var ethLedger = new _hwAppEth2.default(transport);

          ethLedger.getAppConfiguration().then(function (config) {
            // detect eip155 support
            var version = config.version && config.version.split('.').map(function (n) {
              return parseInt(n, 10);
            });
            var eip155 = version && (version[0] > 1 || version[1] > 0 || version[2] > 2);
            ethLedger.eip155 = eip155;

            _this3.ethLedger = ethLedger;
            _this3.setState({
              config: _extends({}, config, { eip155: eip155 })
            });
            resolve();
          }).catch(reject);
        }).catch(reject);
      });
    }
  }, {
    key: 'isReadyForSigning',
    value: function isReadyForSigning() {
      var _state = this.state,
          ready = _state.ready,
          status = _state.status;


      if (this.initializeManually) {
        return status === this.STATUS.readyForSigning;
      }

      return ready;
    }
  }, {
    key: 'startPolling',
    value: function startPolling() {
      var _this4 = this;

      this.pollingStopped = false;
      var poll = function poll() {
        if (_this4.pollingStopped) {
          return null;
        }

        var timer = function timer() {
          if (_this4.pollingStopped) {
            return null;
          }

          // reduce poll speed if we are connected
          var pollSpeed = _this4.isReadyForSigning() ? _constants.POLL_CONNECTED : _constants.POLL_DISCONNECTED;
          _this4.timeout = setTimeout(poll, pollSpeed);
          return null;
        };

        return _this4.getStatus().then(timer).catch(timer);
      };

      poll();
    }
  }, {
    key: 'stopPolling',
    value: function stopPolling() {
      clearTimeout(this.timeout);
      this.pollingStopped = true;
    }
  }, {
    key: 'handleOnReady',
    value: function handleOnReady() {
      if (this.props.onReady) {
        this.props.onReady(this.getChildProps());
      }
    }
  }, {
    key: 'handleInitiateSigning',
    value: function handleInitiateSigning() {
      this.setState({ status: this.STATUS.loading });
      this.startPolling();
    }
  }, {
    key: 'handleSignTransaction',
    value: function handleSignTransaction(kdPath, txData) {
      var ethLedger = this.ethLedger;

      return this.pausePollingForPromise(function () {
        return (0, _signing.signTransaction)({ ethLedger: ethLedger, kdPath: kdPath, txData: txData });
      });
    }
  }, {
    key: 'handleSignMessage',
    value: function handleSignMessage(kdPath, txData) {
      var ethLedger = this.ethLedger;

      return this.pausePollingForPromise(function () {
        return (0, _signing.signMessage)({ ethLedger: ethLedger, kdPath: kdPath, txData: txData });
      });
    }
  }, {
    key: 'pausePollingForPromise',
    value: function pausePollingForPromise(promise) {
      var _this5 = this;

      var ethLedger = this.ethLedger;

      this.stopPolling();

      return promise().then(function (result) {
        _this5.startPolling();
        return result;
      }).catch(function (error) {
        _this5.startPolling();
        throw error;
      });
    }
  }, {
    key: 'renderLoading',
    value: function renderLoading() {
      if (this.props.renderLoading) {
        return this.props.renderLoading();
      }

      return _react2.default.createElement(
        'div',
        null,
        'Please use Chrome, Opera or Firefox with a U2F extension. After connecting your Ledger, open the Ethereum app and make sure ',
        _react2.default.createElement(
          'i',
          null,
          'Contract Data'
        ),
        'is enabled in ',
        _react2.default.createElement(
          'i',
          null,
          'Settings'
        ),
        '. If there is a setting for ',
        _react2.default.createElement(
          'i',
          null,
          'Broswer Mode'
        ),
        ' (for old firmware versions), you need to enable it as well.'
      );
    }
  }, {
    key: 'renderError',
    value: function renderError() {
      var error = this.state.error;

      var message = _react2.default.createElement(
        'div',
        null,
        'Please use Chrome, Opera or Firefox with a U2F extension. After connecting your Ledger, open the Ethereum app and make sure ',
        _react2.default.createElement(
          'i',
          null,
          'Contract Data'
        ),
        'is enabled in ',
        _react2.default.createElement(
          'i',
          null,
          'Settings'
        ),
        '. If there is a setting for ',
        _react2.default.createElement(
          'i',
          null,
          'Broswer Mode'
        ),
        ' (for old firmware versions), you need to enable it as well.'
      );

      if (this.props.renderError) {
        return this.props.renderError({ error: error });
      }

      var errorCode = error.errorCode,
          notExpected = error.notExpected;

      if (notExpected) {
        return _react2.default.createElement(
          'span',
          null,
          'Address mismatch!'
        );
      } else if (errorCode && errorCode === 2) {
        return _react2.default.createElement(
          'span',
          null,
          'U2F is only supported via https://'
        );
      }

      return message;
    }
  }, {
    key: 'renderReady',
    value: function renderReady() {
      return this.props.renderReady(this.getChildProps());
    }
  }, {
    key: 'renderInitSigning',
    value: function renderInitSigning() {
      return this.props.renderInitSigning(this.getChildProps());
    }
  }, {
    key: 'render',
    value: function render() {
      var _state2 = this.state,
          ready = _state2.ready,
          error = _state2.error,
          status = _state2.status;


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
  }]);

  return LedgerContainer;
}(_react.Component);

exports.default = LedgerContainer;
var func = _propTypes2.default.func,
    shape = _propTypes2.default.shape,
    string = _propTypes2.default.string;

LedgerContainer.propTypes = {
  renderError: func,
  renderInitSigning: func,
  renderLoading: func,
  renderReady: func.isRequired,
  onReady: func,
  expect: shape({
    kdPath: string,
    address: string
  })
};

LedgerContainer.defaultProps = {
  renderError: undefined,
  renderInitSigning: undefined,
  renderLoading: undefined,
  onReady: undefined,
  expect: undefined
};