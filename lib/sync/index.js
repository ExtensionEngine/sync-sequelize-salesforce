'use strict';

const Arbiquelize = require('../arbiquelize');
const { CronJob } = require('cron');
const cronstrue = require('cronstrue');
const { EventEmitter } = require('events');
const filter = require('lodash/filter');
const Loader = require('../utils/loader');
const Promise = require('bluebird');
const queue = require('./queue');
const SyncModule = require('./sync-module');
const transform = require('lodash/transform');

const { VersioningStrategy, ValidationStrategy } = Arbiquelize;

const defaults = {
  validationStrategy: ValidationStrategy.FULL,
  versioningStrategy: VersioningStrategy.SYSTEM_META
};

class Sync extends EventEmitter {
  constructor(options) {
    super();
    this.config = Object.assign({}, defaults, options.config);
    this.sfModels = options.sfModels;
    this.importer = options.importer;
  }

  initialize() {
    if (!this.config.cronTime) return this.emit('sync:cronTimeError');
    this.emit('sync:init', cronstrue.toString(this.config.cronTime).toLowerCase());
    queue.add(() => this.run());
    this.scheduleJob();
  }

  scheduleJob() {
    this.cron = new CronJob(this.config.cronTime, () => {
      if (queue.getPendingLength()) return this.emit('sync:overlap');
      queue.add(() => this.run());
    });
    this.cron.start();
  }

  async run() {
    this.emit('sync:start');
    this.syncModules = transform(this.sfModels, (acc, Model) => {
      acc[Model.name] = new SyncModule({ Model, sync: this });
    }, {});
    await this.pull();
    if (this.config.validationStrategy === ValidationStrategy.FULL) {
      await this.validate();
    }
    await this.load();
    await this.importer(this);
    await this.notify();
  }

  pull() {
    return Promise.map(Object.values(this.syncModules), it => it.pull());
  }

  async validate() {
    await Promise.each(Object.values(this.syncModules), it => it.errorManager.flush());
    return Promise.each(Object.values(this.syncModules), it => it.validate());
  }

  load() {
    const loadables = filter(this.syncModules, it => it.Model.resolveAll);
    return Promise.map(loadables, it => it.load());
  }

  notify() {
    const errors = transform(this.syncModules, (acc, syncModule, model) => {
      const modelErrors = syncModule.errorManager.errors;
      if (modelErrors.length) acc[model] = modelErrors;
    });
    this.emit('sync:finish', Object.keys(errors).length ? errors : undefined);
  }

  getLoader(resolved, ...args) {
    const getResolved = it => this.syncModules[it.name].resolved;
    resolved = [].concat(resolved).map(getResolved).flatten();
    return new Loader(resolved, ...args);
  }
}

Sync.Loader = Loader;

module.exports = Sync;
