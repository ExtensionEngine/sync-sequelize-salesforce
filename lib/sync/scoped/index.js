'use strict';

const queue = require('../queue');
const Sync = require('..');
const ScopedSyncModule = require('./scoped-sync-module');
const transform = require('lodash/transform');
const ValidationStrategy = require('../../arbiquelize/validationStrategy');
const VersioningStrategy = require('../../arbiquelize/versioningStrategy');

const defaults = {
  validationStrategy: ValidationStrategy.SKIP,
  versioningStrategy: VersioningStrategy.IGNORE
};

class SyncScoped extends Sync {
  constructor(options) {
    super(options);
    this.config = Object.assign({}, defaults, options.config);
    this.scope = options.scope;
  }

  initialize() {
    this.emit('sync:init');
    queue.add(() => this.run());
  }

  async run() {
    this.emit('sync:start');
    const { config, scope } = this;
    this.syncModules = transform(this.sfModels, (acc, Model) => {
      acc[Model.name] = new ScopedSyncModule({ Model, sync: this });
    }, {});
    this.entryModule = this.syncModules[scope.model.name];
    await this.pull();
    if (config.validationStrategy === ValidationStrategy.FULL) {
      await this.validate();
    }
    await this.load();
    await this.importer(this);
    await this.notify();
  }

  pull() {
    return this.entryModule.pull(this.scope);
  }

  validate() {
    return this.entryModule.validate();
  }
}

module.exports = SyncScoped;
