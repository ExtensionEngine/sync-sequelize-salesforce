'use strict';

const errors = require('../errors');
const filter = require('lodash/filter');
const invokeMap = require('lodash/invokeMap');
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
    this.pulled = [];
    this.failed = [];
  }

  async _pull(entries) {
    try {
      if (!entries) entries = await this.Model.fetchFromSF();
      this.pulled = await this.Model.persistFromSF(entries).catch(err => this.recoverPull(err));
    } catch (err) {
      this.errors.pull = new SyncModulePullError(err, this);
      return Promise.reject(err);
    }
  }

  recoverPull(err) {
    if (!(err instanceof SfPersistanceError)) return Promise.reject(err);
    const [invalid, valid] = partition(err.entries, err.failingField);
    this.failed.push(...invalid);
    return this._pull(valid);
  }

  async validate(callPath = []) {
    this.callers = this.callers || new Set([this.Model.name]);
    const isCyclicCall = callPath.find(it => this.callers.has(it));
    const isDone = this.validator && !this.validatorCallbacks;
    if (isDone || isCyclicCall) return Promise.resolve();

    callPath.push(this.Model.name);
    this.callers = new Set([...this.callers, ...callPath]);

    if (this.validatorCallbacks) {
      return new Promise((resolve, reject) => {
        this.validatorCallbacks.push({ resolve, reject });
      });
    }

    this.validatorCallbacks = [];
    this.validator = new SyncModuleValidator(this);
    return this.validator.run(callPath)
      .then(() => invokeMap(this.validatorCallbacks, 'resolve'))
      .catch(err => invokeMap(this.validatorCallbacks, 'reject', err))
      .finally(() => delete this.validatorCallbacks);
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
