'use strict';

const errors = require('../errors');
const once = require('lodash/once');
const partition = require('lodash/partition');
const Promise = require('bluebird');
const SyncModuleValidation = require('./sync-module-validation');
const transform = require('lodash/transform');

const { SfPersistanceError, SyncModulePullError } = errors;

class SyncModule {
  constructor({ Model, sync }) {
    this.Model = Model;
    this.sync = sync;

    this.pull = once(this._pull);
    this.validate = once(this._validate);
    this.pulled = [];
    this.failed = [];
  }

  get dependencies() {
    const { Model, sync } = this;
    const dependentAssociations = ['BelongsTo'];
    const isCircular = it => it.target.name === Model.name;
    const isDependent = it => dependentAssociations.includes(it.associationType);
    const associations = transform(Model.associations, (acc, it) => {
      if (!isCircular(it) && isDependent(it)) acc.push(it);
    }, []);
    const syncModules = associations.map(it => sync.syncModules[it.target.name]);
    return {
      associations,
      modules: Array.from(new Set(syncModules))
    };
  }

  async _pull(entries) {
    try {
      await this.pullDependencies();
      this.pulled = await this.Model.persistFromSF(entries)
        .catch(err => this.recoverPull(err));
    } catch (err) {
      this.errors.pull = new SyncModulePullError(err, this);
    }
  }

  pullDependencies() {
    return Promise.map(this.dependencies.modules, it => it.pull());
  }

  recoverPull(err) {
    if (!(err instanceof SfPersistanceError)) return Promise.reject(err);
    const [invalid, valid] = partition(err.entries, err.failingField);
    this.failed.push(...invalid);
    return this._pull(valid);
  }

  _validate() {
    return new SyncModuleValidation(this).run;
  }
}

module.exports = SyncModule;
