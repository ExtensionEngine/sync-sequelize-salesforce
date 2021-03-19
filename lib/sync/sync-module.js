'use strict';

const errors = require('../errors');
const filter = require('lodash/filter');
const Loader = require('../utils/loader');
const once = require('lodash/once');
const partition = require('lodash/partition');
const Promise = require('bluebird');
const SyncModuleValidator = require('./sync-module-validator');

const { ErrorManager, SfPersistanceError, SyncModulePullError } = errors;

class SyncModule {
  constructor({ Model, sync }) {
    this.Model = Model;
    this.sync = sync;
    this.errors = new ErrorManager(this.Model);

    this.pull = once(this._pull);
    this.validate = once(this._validate);
    this.pulled = [];
    this.failed = [];
  }

  get dependencies() {
    const query = { associationType: 'BelongsTo', isSelfAssociation: false };
    const associations = filter(this.Model.associations, query);
    const getModule = it => this.sync.syncModules[it.target.name];
    const modules = new Set(associations.map(getModule));
    return {
      associations,
      modules: Array.from(modules)
    };
  }

  async _pull(entries) {
    try {
      await this.pullDependencies();
      this.pulled = await this.Model.persistFromSF(entries)
        .catch(err => this.recoverPull(err));
    } catch (err) {
      this.errors.pull = new SyncModulePullError(err, this);
      return Promise.reject(err);
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
    return new SyncModuleValidator(this).run();
  }

  async load() {
    this.resolved = await this.Model.resolveAll();
    this.loader = new Loader(this.resolved);
    return this.resolved;
  }

  notify() {
    console.log(`****** ${this.Model.name} errors *****`);
    this.errors.errors.forEach(it => console.log(it.message));
  }
}

module.exports = SyncModule;
