'use strict';

const compact = require('lodash/compact');
const Promise = require('bluebird');
const once = require('lodash/once');
const transform = require('lodash/transform');
class SyncModule {
  constructor({ Model, sync }) {
    this.Model = Model;
    this.sync = sync;

    this.pull = once(this._pull);
    this.pulled = [];
    this.failed = [];
  }

  get dependencies() {
    const depAssociations = ['BelongsTo'];
    const isCircular = it => it.target.name === this.Model.name;
    const dependencies = transform(this.Model.associations, (acc, it) => {
      if (!isCircular(it) && depAssociations.includes(it.associationType)) {
        acc.push(this.sync.syncModules[it.target.name]);
      }
    }, []);
    return new Set(compact(dependencies));
  }

  async _pull() {
    await Promise.map(this.dependencies, it => it.pull());
    return this.Model.pullFromSF();
  }
}

module.exports = SyncModule;
