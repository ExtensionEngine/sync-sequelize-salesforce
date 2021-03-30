'use strict';

const PromiseQueue = require('promise-queue');

module.exports = new PromiseQueue(1, Infinity);
