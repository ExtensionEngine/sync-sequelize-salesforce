'use strict';

const Arbiquelize = require('../arbiquelize');
const bunyan = require('bunyan');
const { CronJob } = require('cron');
const cronstrue = require('cronstrue');
const filter = require('lodash/filter');
const Loader = require('../utils/loader');
const Promise = require('bluebird');
const queue = require('./queue');
const SyncModule = require('./sync-module');
const transform = require('lodash/transform');

const { VersioningStrategy, ValidationStrategy } = Arbiquelize;
const logger = bunyan.createLogger({ name: 'sequelize-salesforce-sync' });

const defaults = {
  validationStrategy: ValidationStrategy.FULL,
  versioningStrategy: VersioningStrategy.SYSTEM_META
};

class Sync {
  constructor(options) {
    this.config = Object.assign({}, defaults, options.config);
    this.sfModels = options.sfModels;
    this.importer = options.importer;
  }

  initialize() {
    logger.info('Initializing SF sync');
    if (!this.config.cronTime) return logger.info('SF sync time undefined! Aborting...');
    logger.info('SF sync time set to', cronstrue.toString(this.config.cronTime).toLowerCase());
    queue.add(() => this.run());
    this.scheduleJob();
  }

  scheduleJob() {
    this.cron = new CronJob(this.config.cronTime, () => {
      logger.info('SF sync cron triggered!');
      const inProgress = queue.getPendingLength();
      if (inProgress) return logger.info('Sync in progress, skipping iteration...');
      queue.add(() => this.run());
    });
    this.cron.start();
  }

  async run() {
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
    logger.info('SF sync completed');
  }

  pull() {
    return Promise.map(Object.values(this.syncModules), it => it.pull());
  }

  async validate() {
    await Promise.each(Object.values(this.syncModules), it => it.errors.flush());
    return Promise.each(Object.values(this.syncModules), it => it.validate());
  }

  load() {
    const loadables = filter(this.syncModules, it => it.Model.resolveAll);
    return Promise.map(loadables, it => it.load());
  }

  notify() {
    Object.values(this.syncModules).forEach(it => it.notify());
    return Promise.resolve();
  }

  getLoader(resolved, ...args) {
    const getResolved = it => this.syncModules[it.name].resolved;
    resolved = [].concat(resolved).map(getResolved).flatten();
    return new Loader(resolved, ...args);
  }
}

Sync.Loader = Loader;

module.exports = Sync;
