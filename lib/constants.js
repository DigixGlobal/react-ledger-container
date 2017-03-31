"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var DEFAULT_KD_PATH = exports.DEFAULT_KD_PATH = "44'/60'/0'/";
var TIMEOUT_DEFAULT = exports.TIMEOUT_DEFAULT = 5 * 1000; // timeout for when user disconnects
var TIMEOUT_SIGNING = exports.TIMEOUT_SIGNING = 60 * 1000; // timeout for when user is shown signing message
var POLL_CONNECTED = exports.POLL_CONNECTED = 10 * 1000; // poll speed when device is ready
var POLL_DISCONNECTED = exports.POLL_DISCONNECTED = 1 * 1000; // poll speed when device isn't ready