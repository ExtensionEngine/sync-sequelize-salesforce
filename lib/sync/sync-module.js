'use strict';

const once = require('lodash/once');

class SyncModule {
  constructor({ Model, sync }) {
    this.Model = Model;
    this.sync = sync;

    this.pull = once(this._pull);
    this.pulled = [];
    this.failed = [];
  }

  async _pull() {
    // TODO: implementation
  }
}

module.exports = SyncModule;
