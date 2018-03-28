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

var _ledgerco = require('ledgerco');

var _ledgerco2 = _interopRequireDefault(_ledgerco);

var _signing = require('./signing');

var _helpers = require('./helpers');

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* eslint-disable no-param-reassign, new-cap, react/require-default-props */

// import u2f from 'ledgerco/browser/u2f-api';

// global.u2f = u2f;

var LedgerContianer = function (_Component) {
  _inherits(LedgerContianer, _Component);

  function LedgerContianer(props) {
    _classCallCheck(this, LedgerContianer);

    var _this = _possibleConstructorReturn(this, (LedgerContianer.__proto__ || Object.getPrototypeOf(LedgerContianer)).call(this, props));

    _this.state = { error: false, ready: false, config: null };
    _this.handleSignTransaction = _this.handleSignTransaction.bind(_this);
    _this.handleSignMessage = _this.handleSignMessage.bind(_this);
    return _this;
  }

  _createClass(LedgerContianer, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.startPolling();
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
            // console.log('getting ', this.ethLedger);
            _this2.ethLedger.getAddress_async(kdPath || _constants.DEFAULT_KD_PATH + '0').then(function (result) {
              if (address && (0, _helpers.sanitizeAddress)(result.address) !== (0, _helpers.sanitizeAddress)(address)) {
                return reject({ notExpected: true });
              }
              return resolve();
            }).fail(reject);
          } catch (err) {
            reject(err);
          }
        }).catch(reject);
      }).then(function () {
        // only trigger `ready` if it's a new non-error...
        if (!_this2.state.ready) {
          _this2.setState({ error: false, ready: true });
          _this2.handleOnReady();
        }
      }).catch(function (error) {
        return _this2.setState({ error: error, ready: false });
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
        _ledgerco2.default.comm_u2f.create_async().then(function (comm) {
          comm.timeoutSeconds = _constants.TIMEOUT_DEFAULT;
          var ethLedger = new _ledgerco2.default.eth(comm);
          ethLedger.getAppConfiguration_async().then(function (config) {
            var v = config.version && config.version.split('.').map(function (n) {
              return parseInt(n, 10);
            });
            // detect eip155 support
            var eip155 = v && (v[0] > 1 || v[1] > 0 || v[2] > 2);
            ethLedger.eip155 = eip155;
            _this3.ethLedger = ethLedger;
            _this3.setState({ config: _extends({}, config, { eip155: eip155 }) });
            resolve();
          }).fail(reject);
        }).fail(reject);
      });
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
          var pollSpeed = _this4.state.ready ? _constants.POLL_CONNECTED : _constants.POLL_DISCONNECTED;
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

      ethLedger.comm.timeoutSeconds = _constants.TIMEOUT_SIGNING;
      this.stopPolling();
      return promise().then(function (result) {
        ethLedger.comm.timeoutSeconds = _constants.TIMEOUT_DEFAULT;
        _this5.startPolling();
        return result;
      }).catch(function (error) {
        ethLedger.comm.timeoutSeconds = _constants.TIMEOUT_DEFAULT;
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
        'span',
        null,
        'Please connect Ledger, open the Ethereum app and enable ',
        _react2.default.createElement(
          'i',
          null,
          'Browser Mode'
        )
      );
    }
  }, {
    key: 'renderError',
    value: function renderError() {
      var error = this.state.error;

      var message = '';
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
      } else if (errorCode && errorCode === 5) {
        message = _react2.default.createElement(
          'span',
          null,
          'Open app on Ledger Wallet and ensure ',
          _react2.default.createElement(
            'i',
            null,
            'Browser Mode'
          ),
          ' is enabled.'
        );
      } else {
        message = _react2.default.createElement(
          'span',
          null,
          'Open app on Ledger Wallet and ensure ',
          _react2.default.createElement(
            'i',
            null,
            'Browser Mode'
          ),
          ' is enabled.'
        );
      }
      return _react2.default.createElement(
        'span',
        null,
        'Error: ',
        JSON.stringify(message)
      );
    }
  }, {
    key: 'renderReady',
    value: function renderReady() {
      return this.props.renderReady(this.getChildProps());
    }
  }, {
    key: 'render',
    value: function render() {
      var _state = this.state,
          ready = _state.ready,
          error = _state.error;

      if (ready) {
        return this.renderReady();
      }
      if (error) {
        return this.renderError();
      }
      return this.renderLoading();
    }
  }]);

  return LedgerContianer;
}(_react.Component);

exports.default = LedgerContianer;


LedgerContianer.propTypes = {
  renderReady: _propTypes2.default.func.isRequired,
  renderLoading: _propTypes2.default.func,
  renderError: _propTypes2.default.func,
  onReady: _propTypes2.default.func,
  expect: _propTypes2.default.shape({
    kdPath: _propTypes2.default.string,
    address: _propTypes2.default.string
  })
};