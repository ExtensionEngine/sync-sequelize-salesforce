'use strict';

const Promise = require('bluebird');

function pull() {
  const modules = Object.values(this.syncModules);
  return Promise.map(modules, it => it.pull());
}

module.exports = {
  pull
};
