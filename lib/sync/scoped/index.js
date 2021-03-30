'use strict';

const queue = require('../queue');
const Sync = require('..');
const ScopedSyncModule = require('./scoped-sync-module');
const transform = require('lodash/transform');

const defaultOptions = {
  validate: true,
  notify: true
};

class SyncScoped extends Sync {
  constructor(options) {
    options = Object.assign({}, defaultOptions, options);
    super(options);
    this.scopeModel = options.scope.model;
    this.options = options;
  }

  initialize() {
    queue.add(() => this.run());
  }

  async run() {
    this.syncModules = transform(this.sfModels, (acc, Model) => {
      acc[Model.name] = new ScopedSyncModule({ Model, sync: this });
    }, {});
    await this.pull();
    if (this.options.validate) await this.validate();
    await this.load();
    await this.importer(this);
    if (this.options.notify) await this.notify();
  }

  pull() {
    const { ids, version } = this.options.scope;
    const scope = { ids, version: version || new Date(0) };
    return this.syncModules[this.scopeModel.name].pull(scope);
  }

  validate() {
    return this.syncModules[this.scopeModel.name].validate();
  }
}

module.exports = SyncScoped;
